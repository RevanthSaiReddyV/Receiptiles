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
  const itemName = searchParams.get("itemName");

  const where: Record<string, unknown> = {};

  if (category) {
    where.category = { equals: category, mode: "insensitive" };
  }

  if (itemName) {
    where.name = { contains: itemName, mode: "insensitive" };
  }

  if (since || until) {
    const receiptWhere: Record<string, unknown> = {};
    const purchasedAt: Record<string, Date> = {};
    if (since) purchasedAt.gte = new Date(since);
    if (until) purchasedAt.lte = new Date(until);
    receiptWhere.purchasedAt = purchasedAt;
    where.receipt = receiptWhere;
  }

  const [items, total] = await Promise.all([
    db.receiptItem.findMany({
      where,
      orderBy: { receipt: { purchasedAt: "desc" } },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        category: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true,
        sku: true,
        receipt: {
          select: {
            merchantCanonicalName: true,
            merchantCategory: true,
            purchasedAt: true,
          },
        },
      },
    }),
    db.receiptItem.count({ where }),
  ]);

  // Basket analysis: find items frequently bought together
  const basketAnalysis = await getBasketAnalysis(where, limit);

  // Log usage
  await db.dataApiUsageLog.create({
    data: {
      apiKeyId: key.id,
      endpoint: "/api/data/v1/items",
      params: { limit, offset, since, until, category, itemName },
      status: 200,
      responseMs: 0,
    },
  });

  return NextResponse.json({
    data: items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      sku: item.sku,
      merchant: item.receipt.merchantCanonicalName,
      merchantCategory: item.receipt.merchantCategory,
      purchasedAt: item.receipt.purchasedAt,
    })),
    basketAnalysis,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

async function getBasketAnalysis(
  where: Record<string, unknown>,
  limit: number
) {
  // Group items by name to find frequency and avg price
  const itemGroups = await db.receiptItem.groupBy({
    by: ["name"],
    where,
    _count: { id: true },
    _avg: { unitPrice: true },
    _sum: { quantity: true },
    orderBy: { _count: { id: "desc" } },
    take: Math.min(limit, 20),
  });

  return itemGroups.map((g) => ({
    itemName: g.name,
    purchaseCount: g._count.id,
    avgPrice: g._avg.unitPrice ?? 0,
    totalQuantity: g._sum.quantity ?? 0,
  }));
}
