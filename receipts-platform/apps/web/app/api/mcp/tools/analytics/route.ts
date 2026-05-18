import { NextRequest } from "next/server";
import { db } from "@receipts/db";
import {
  validateMCPAuth,
  isMCPAuthError,
  mcpResponse,
  mcpError,
} from "@/lib/mcp-auth";

/**
 * GET /api/mcp/tools/analytics
 *
 * Get aggregated spending analytics for the authenticated user.
 * Requires scope: analytics:read
 *
 * Query params:
 *   period  - "week" | "month" | "year" (default: "month")
 *   groupBy - "merchant" | "category" | "day" (default: "category")
 */
export async function GET(req: NextRequest) {
  const auth = await validateMCPAuth(req, "analytics:read");
  if (isMCPAuthError(auth)) return auth.response;

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "month";
  const groupBy = searchParams.get("groupBy") ?? "category";

  if (!["week", "month", "year"].includes(period)) {
    return mcpError(
      "Invalid period. Must be: week, month, or year",
      "invalid_request",
      400,
      auth.requestId
    );
  }

  if (!["merchant", "category", "day"].includes(groupBy)) {
    return mcpError(
      "Invalid groupBy. Must be: merchant, category, or day",
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

  try {
    const receipts = await db.receipt.findMany({
      where: {
        userId: auth.userId,
        purchasedAt: { gte: dateFrom, lte: now },
      },
      select: {
        id: true,
        merchantCanonicalName: true,
        merchantCategory: true,
        total: true,
        purchasedAt: true,
      },
      orderBy: { purchasedAt: "asc" },
    });

    // Aggregate by groupBy field
    const aggregations = new Map<
      string,
      { total: number; count: number; items: number[] }
    >();

    for (const receipt of receipts) {
      let key: string;

      switch (groupBy) {
        case "merchant":
          key = receipt.merchantCanonicalName;
          break;
        case "category":
          key = receipt.merchantCategory;
          break;
        case "day":
          key = receipt.purchasedAt.toISOString().split("T")[0];
          break;
        default:
          key = receipt.merchantCategory;
      }

      const existing = aggregations.get(key) ?? {
        total: 0,
        count: 0,
        items: [],
      };
      existing.total += receipt.total;
      existing.count += 1;
      existing.items.push(receipt.total);
      aggregations.set(key, existing);
    }

    // Transform to response format
    const groups = Array.from(aggregations.entries())
      .map(([key, data]) => ({
        label: key,
        totalCents: Math.round(data.total * 100),
        transactionCount: data.count,
        averageCents: Math.round((data.total / data.count) * 100),
        minCents: Math.round(Math.min(...data.items) * 100),
        maxCents: Math.round(Math.max(...data.items) * 100),
      }))
      .sort((a, b) => b.totalCents - a.totalCents);

    const totalSpentCents = Math.round(
      receipts.reduce((sum, r) => sum + r.total, 0) * 100
    );

    return mcpResponse(
      {
        data: {
          period,
          groupBy,
          dateFrom: dateFrom.toISOString(),
          dateTo: now.toISOString(),
          summary: {
            totalSpentCents,
            transactionCount: receipts.length,
            averageTransactionCents:
              receipts.length > 0
                ? Math.round(totalSpentCents / receipts.length)
                : 0,
            uniqueMerchants: new Set(
              receipts.map((r) => r.merchantCanonicalName)
            ).size,
          },
          groups,
        },
      },
      auth.requestId
    );
  } catch (err) {
    return mcpError(
      "Failed to compute analytics",
      "internal_error",
      500,
      auth.requestId
    );
  }
}
