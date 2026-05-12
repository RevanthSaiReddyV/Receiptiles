import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@receipts/db";

/**
 * GET /api/v1/stats
 * Spending summary stats for the authenticated user.
 * Query params: from, to, groupBy (category|merchant|month)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const groupBy = searchParams.get("groupBy") || "category";

  const where: Record<string, unknown> = { userId: auth.userId };
  if (from || to) {
    where.purchasedAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const receipts = await db.receipt.findMany({
    where,
    select: {
      total: true,
      merchantCategory: true,
      merchantCanonicalName: true,
      purchasedAt: true,
    },
    orderBy: { purchasedAt: "desc" },
  });

  const totalSpend = receipts.reduce((sum, r) => sum + r.total, 0);
  const receiptCount = receipts.length;

  let breakdown: Record<string, number> = {};

  if (groupBy === "category") {
    for (const r of receipts) {
      breakdown[r.merchantCategory] = (breakdown[r.merchantCategory] || 0) + r.total;
    }
  } else if (groupBy === "merchant") {
    for (const r of receipts) {
      breakdown[r.merchantCanonicalName] = (breakdown[r.merchantCanonicalName] || 0) + r.total;
    }
  } else if (groupBy === "month") {
    for (const r of receipts) {
      const key = r.purchasedAt.toISOString().slice(0, 7); // YYYY-MM
      breakdown[key] = (breakdown[key] || 0) + r.total;
    }
  }

  // Sort by value descending
  breakdown = Object.fromEntries(
    Object.entries(breakdown).sort(([, a], [, b]) => b - a)
  );

  return NextResponse.json({
    data: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      receiptCount,
      groupBy,
      breakdown,
      period: { from: from || "all", to: to || "now" },
    },
  });
}
