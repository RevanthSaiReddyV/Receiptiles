import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@receipts/db";

/**
 * GET /api/v1/receipts
 * List receipts for the authenticated user.
 * Query params: limit, offset, merchant, category, from, to
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const offset = Number(searchParams.get("offset")) || 0;
  const merchant = searchParams.get("merchant");
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = { userId: auth.userId };

  if (merchant) {
    where.merchantCanonicalName = { contains: merchant, mode: "insensitive" };
  }
  if (category) {
    where.merchantCategory = { contains: category, mode: "insensitive" };
  }
  if (from || to) {
    where.purchasedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [receipts, total] = await Promise.all([
    db.receipt.findMany({
      where,
      include: { items: true },
      orderBy: { purchasedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.receipt.count({ where }),
  ]);

  return NextResponse.json({
    data: receipts.map(formatReceipt),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

function formatReceipt(r: Record<string, unknown> & { items?: unknown[] }) {
  return {
    id: r.id,
    source: r.source,
    merchant: {
      name: r.merchantCanonicalName,
      rawName: r.merchantRawName,
      category: r.merchantCategory,
      location: r.merchantLocation,
    },
    purchase: {
      date: r.purchasedAt,
      currency: r.currency,
      subtotal: r.subtotal,
      tax: r.tax,
      tip: r.tip,
      discount: r.discount,
      fees: r.fees,
      total: r.total,
    },
    payment: {
      method: r.paymentMethod,
      cardLast4: r.cardLast4,
      walletType: r.walletType,
    },
    items: (r.items || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      category: item.category,
    })),
    confidence: r.confidence,
    createdAt: r.createdAt,
  };
}
