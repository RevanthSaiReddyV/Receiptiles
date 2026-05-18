import { NextRequest } from "next/server";
import { db } from "@receipts/db";
import {
  validateMCPAuth,
  isMCPAuthError,
  mcpResponse,
  mcpError,
} from "@/lib/mcp-auth";

/**
 * GET /api/mcp/tools/receipts
 *
 * List and search receipts for the authenticated user.
 * Requires scope: receipts:read
 *
 * Query params:
 *   limit    - Number of results (default 20, max 100)
 *   offset   - Pagination offset (default 0)
 *   merchant - Filter by merchant name (partial match, case-insensitive)
 *   dateFrom - Filter receipts from this date (ISO 8601)
 *   dateTo   - Filter receipts up to this date (ISO 8601)
 *   minAmount - Minimum total in cents
 *   maxAmount - Maximum total in cents
 */
export async function GET(req: NextRequest) {
  const auth = await validateMCPAuth(req, "receipts:read");
  if (isMCPAuthError(auth)) return auth.response;

  const { searchParams } = new URL(req.url);

  // Parse pagination
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
    100
  );
  const offset = Math.max(
    parseInt(searchParams.get("offset") ?? "0", 10) || 0,
    0
  );

  // Parse filters
  const merchant = searchParams.get("merchant");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const minAmountCents = searchParams.get("minAmount");
  const maxAmountCents = searchParams.get("maxAmount");

  // Build where clause
  const where: Record<string, unknown> = {
    userId: auth.userId,
  };

  if (merchant) {
    where.merchantCanonicalName = {
      contains: merchant,
      mode: "insensitive",
    };
  }

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    where.purchasedAt = dateFilter;
  }

  if (minAmountCents || maxAmountCents) {
    const totalFilter: Record<string, number> = {};
    if (minAmountCents)
      totalFilter.gte = parseInt(minAmountCents, 10) / 100;
    if (maxAmountCents)
      totalFilter.lte = parseInt(maxAmountCents, 10) / 100;
    where.total = totalFilter;
  }

  try {
    const [receipts, total] = await Promise.all([
      db.receipt.findMany({
        where,
        include: {
          items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              category: true,
              sku: true,
            },
          },
        },
        orderBy: { purchasedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.receipt.count({ where }),
    ]);

    // Transform amounts to cents for consistency
    const transformedReceipts = receipts.map((r) => ({
      id: r.id,
      merchant: {
        name: r.merchantCanonicalName,
        rawName: r.merchantRawName,
        category: r.merchantCategory,
        location: r.merchantLocation,
      },
      purchasedAt: r.purchasedAt.toISOString(),
      currency: r.currency,
      subtotal: Math.round(r.subtotal * 100),
      tax: Math.round(r.tax * 100),
      tip: Math.round(r.tip * 100),
      discount: Math.round(r.discount * 100),
      fees: Math.round(r.fees * 100),
      total: Math.round(r.total * 100),
      paymentMethod: r.paymentMethod,
      cardLast4: r.cardLast4,
      source: r.source,
      items: r.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Math.round(item.unitPrice * 100),
        totalPrice: Math.round(item.totalPrice * 100),
        category: item.category,
        sku: item.sku,
      })),
    }));

    return mcpResponse(
      {
        data: transformedReceipts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      auth.requestId
    );
  } catch (err) {
    return mcpError(
      "Failed to fetch receipts",
      "internal_error",
      500,
      auth.requestId
    );
  }
}
