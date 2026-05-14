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
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};

  if (since || until) {
    const purchasedAt: Record<string, Date> = {};
    if (since) purchasedAt.gte = new Date(since);
    if (until) purchasedAt.lte = new Date(until);
    where.purchasedAt = purchasedAt;
  }

  if (category) {
    where.merchantCategory = { equals: category, mode: "insensitive" };
  }

  const merchantGroups = await db.receipt.groupBy({
    by: ["merchantCanonicalName", "merchantCategory"],
    where,
    _sum: { total: true },
    _count: { id: true },
    _avg: { total: true },
    _min: { purchasedAt: true },
    _max: { purchasedAt: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
    skip: offset,
  });

  const merchants = merchantGroups.map((m) => ({
    merchantName: m.merchantCanonicalName,
    category: m.merchantCategory,
    frequency: m._count.id,
    totalSpent: m._sum.total ?? 0,
    avgSpend: m._avg.total ?? 0,
    firstVisit: m._min.purchasedAt,
    lastVisit: m._max.purchasedAt,
  }));

  // Log usage
  await db.dataApiUsageLog.create({
    data: {
      apiKeyId: key.id,
      endpoint: "/api/data/v1/merchants",
      params: { limit, offset, since, until, category },
      status: 200,
      responseMs: 0,
    },
  });

  return NextResponse.json({
    data: merchants,
    pagination: {
      limit,
      offset,
      hasMore: merchants.length === limit,
    },
  });
}
