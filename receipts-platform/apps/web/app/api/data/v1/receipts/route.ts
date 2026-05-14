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
  const merchant = searchParams.get("merchant");

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

  if (merchant) {
    where.merchantCanonicalName = { contains: merchant, mode: "insensitive" };
  }

  const [receipts, total] = await Promise.all([
    db.receipt.findMany({
      where,
      orderBy: { purchasedAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        merchantCanonicalName: true,
        merchantCategory: true,
        merchantLocation: true,
        purchasedAt: true,
        currency: true,
        subtotal: true,
        tax: true,
        total: true,
        paymentMethod: true,
        items: {
          select: {
            name: true,
            category: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
      },
    }),
    db.receipt.count({ where }),
  ]);

  // Log usage
  await db.dataApiUsageLog.create({
    data: {
      apiKeyId: key.id,
      endpoint: "/api/data/v1/receipts",
      params: { limit, offset, since, until, category, merchant },
      status: 200,
      responseMs: 0,
    },
  });

  return NextResponse.json({
    data: receipts,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}
