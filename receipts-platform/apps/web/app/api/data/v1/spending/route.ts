import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";

async function authenticateApiKey(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return null;
  const key = await db.dataApiKey.findFirst({
    where: { key: apiKey, active: true },
  });
  return key;
}

export async function GET(request: NextRequest) {
  const key = await authenticateApiKey(request);
  if (!key) {
    return NextResponse.json(
      { error: "API key required or invalid" },
      { status: 401 }
    );
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const groupBy = searchParams.get("groupBy") ?? "category"; // category | merchant | month

  const where: Record<string, unknown> = {};

  if (since || until) {
    const purchasedAt: Record<string, Date> = {};
    if (since) purchasedAt.gte = new Date(since);
    if (until) purchasedAt.lte = new Date(until);
    where.purchasedAt = purchasedAt;
  }

  let aggregations: Array<{
    group: string;
    totalSpent: number;
    transactionCount: number;
    avgTransaction: number;
  }> = [];

  if (groupBy === "category") {
    const results = await db.receipt.groupBy({
      by: ["merchantCategory"],
      where,
      _sum: { total: true },
      _count: { id: true },
      _avg: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: limit,
      skip: offset,
    });

    aggregations = results.map((r) => ({
      group: r.merchantCategory,
      totalSpent: r._sum.total ?? 0,
      transactionCount: r._count.id,
      avgTransaction: r._avg.total ?? 0,
    }));
  } else if (groupBy === "merchant") {
    const results = await db.receipt.groupBy({
      by: ["merchantCanonicalName"],
      where,
      _sum: { total: true },
      _count: { id: true },
      _avg: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: limit,
      skip: offset,
    });

    aggregations = results.map((r) => ({
      group: r.merchantCanonicalName,
      totalSpent: r._sum.total ?? 0,
      transactionCount: r._count.id,
      avgTransaction: r._avg.total ?? 0,
    }));
  } else if (groupBy === "month") {
    // Use snapshots for monthly data
    const snapshots = await db.spendingSnapshot.findMany({
      where: {
        ...(since ? { period: { gte: since.substring(0, 7) } } : {}),
        ...(until ? { period: { lte: until.substring(0, 7) } } : {}),
      },
      orderBy: { period: "desc" },
      take: limit,
      skip: offset,
    });

    // Group snapshots by period
    const periodMap = new Map<
      string,
      { totalSpent: number; transactionCount: number }
    >();
    for (const s of snapshots) {
      const existing = periodMap.get(s.period) ?? {
        totalSpent: 0,
        transactionCount: 0,
      };
      existing.totalSpent += s.total;
      existing.transactionCount += s.count;
      periodMap.set(s.period, existing);
    }

    aggregations = Array.from(periodMap.entries()).map(([period, data]) => ({
      group: period,
      totalSpent: data.totalSpent,
      transactionCount: data.transactionCount,
      avgTransaction:
        data.transactionCount > 0
          ? data.totalSpent / data.transactionCount
          : 0,
    }));
  }

  // Log usage
  await db.dataApiUsageLog.create({
    data: {
      apiKeyId: key.id,
      endpoint: "/api/data/v1/spending",
      params: { limit, offset, since, until, groupBy },
      status: 200,
      responseMs: 0,
    },
  });

  return NextResponse.json({
    data: aggregations,
    pagination: {
      limit,
      offset,
      hasMore: aggregations.length === limit,
    },
    meta: {
      groupBy,
      since: since ?? null,
      until: until ?? null,
    },
  });
}
