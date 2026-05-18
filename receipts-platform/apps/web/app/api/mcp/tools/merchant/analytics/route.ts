import { NextRequest } from "next/server";
import { db } from "@receipts/db";
import {
  validateMCPAuth,
  isMCPAuthError,
  mcpResponse,
  mcpError,
} from "@/lib/mcp-auth";

/**
 * GET /api/mcp/tools/merchant/analytics
 *
 * Get merchant sales analytics including revenue, customer count,
 * average ticket, and top items.
 * Requires scope: merchant:analytics
 *
 * Query params:
 *   period - "week" | "month" | "year" (default: "month")
 */
export async function GET(req: NextRequest) {
  const auth = await validateMCPAuth(req, "merchant:analytics");
  if (isMCPAuthError(auth)) return auth.response;

  // Get the merchant connection for this user
  const merchantConnection = await db.merchantConnection.findFirst({
    where: { userId: auth.userId, isActive: true },
  });

  if (!merchantConnection) {
    return mcpError(
      "No active merchant connection found. Connect a POS system first.",
      "no_merchant",
      403,
      auth.requestId
    );
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";

  if (!["week", "month", "year"].includes(period)) {
    return mcpError(
      "Invalid period. Must be: week, month, or year",
      "invalid_request",
      400,
      auth.requestId
    );
  }

  // Calculate date range
  const now = new Date();
  let dateFrom: Date;

  switch (period) {
    case "week":
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case "year":
      dateFrom = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }

  const merchantName =
    merchantConnection.merchantName ?? merchantConnection.merchantId;

  try {
    // Fetch all receipts for this merchant in the period
    const receipts = await db.receipt.findMany({
      where: {
        merchantCanonicalName: {
          equals: merchantName,
          mode: "insensitive",
        },
        purchasedAt: { gte: dateFrom, lte: now },
      },
      include: {
        items: {
          select: {
            name: true,
            quantity: true,
            totalPrice: true,
          },
        },
      },
    });

    // Calculate revenue metrics
    const totalRevenue = receipts.reduce((sum, r) => sum + r.total, 0);
    const totalTax = receipts.reduce((sum, r) => sum + r.tax, 0);
    const totalTips = receipts.reduce((sum, r) => sum + r.tip, 0);
    const totalDiscount = receipts.reduce((sum, r) => sum + r.discount, 0);

    // Unique customers
    const uniqueCustomers = new Set(receipts.map((r) => r.userId));

    // Average ticket
    const averageTicket =
      receipts.length > 0 ? totalRevenue / receipts.length : 0;

    // Top items by quantity and revenue
    const itemAggregations = new Map<
      string,
      { quantity: number; revenue: number }
    >();
    for (const receipt of receipts) {
      for (const item of receipt.items) {
        const existing = itemAggregations.get(item.name) ?? {
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        itemAggregations.set(item.name, existing);
      }
    }

    const topItemsByRevenue = Array.from(itemAggregations.entries())
      .map(([name, data]) => ({
        name,
        quantitySold: data.quantity,
        revenueCents: Math.round(data.revenue * 100),
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 10);

    const topItemsByQuantity = Array.from(itemAggregations.entries())
      .map(([name, data]) => ({
        name,
        quantitySold: data.quantity,
        revenueCents: Math.round(data.revenue * 100),
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    // Daily revenue breakdown
    const dailyRevenue = new Map<string, { total: number; count: number }>();
    for (const receipt of receipts) {
      const day = receipt.purchasedAt.toISOString().split("T")[0];
      const existing = dailyRevenue.get(day) ?? { total: 0, count: 0 };
      existing.total += receipt.total;
      existing.count += 1;
      dailyRevenue.set(day, existing);
    }

    const dailyBreakdown = Array.from(dailyRevenue.entries())
      .map(([date, data]) => ({
        date,
        revenueCents: Math.round(data.total * 100),
        transactionCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return mcpResponse(
      {
        data: {
          merchant: {
            id: merchantConnection.merchantId,
            name: merchantName,
            provider: merchantConnection.provider,
          },
          period,
          dateFrom: dateFrom.toISOString(),
          dateTo: now.toISOString(),
          summary: {
            totalRevenueCents: Math.round(totalRevenue * 100),
            totalTaxCents: Math.round(totalTax * 100),
            totalTipsCents: Math.round(totalTips * 100),
            totalDiscountCents: Math.round(totalDiscount * 100),
            transactionCount: receipts.length,
            uniqueCustomers: uniqueCustomers.size,
            averageTicketCents: Math.round(averageTicket * 100),
          },
          topItemsByRevenue,
          topItemsByQuantity,
          dailyBreakdown,
        },
      },
      auth.requestId
    );
  } catch (err) {
    return mcpError(
      "Failed to compute merchant analytics",
      "internal_error",
      500,
      auth.requestId
    );
  }
}
