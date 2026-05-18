import { NextRequest } from "next/server";
import { db } from "@receipts/db";
import {
  validateMCPAuth,
  isMCPAuthError,
  mcpResponse,
  mcpError,
} from "@/lib/mcp-auth";

/**
 * GET /api/mcp/tools/merchant/receipts
 *
 * List receipts issued by the authenticated merchant.
 * Requires scope: merchant:read
 *
 * Query params:
 *   limit    - Number of results (default 20, max 100)
 *   offset   - Pagination offset (default 0)
 *   dateFrom - Filter from this date (ISO 8601)
 *   dateTo   - Filter up to this date (ISO 8601)
 */
export async function GET(req: NextRequest) {
  const auth = await validateMCPAuth(req, "merchant:read");
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

  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
    100
  );
  const offset = Math.max(
    parseInt(searchParams.get("offset") ?? "0", 10) || 0,
    0
  );
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // Build where clause - find receipts matching merchant name
  const merchantName =
    merchantConnection.merchantName ?? merchantConnection.merchantId;
  const where: Record<string, unknown> = {
    merchantCanonicalName: {
      equals: merchantName,
      mode: "insensitive",
    },
  };

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    where.purchasedAt = dateFilter;
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
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { purchasedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      db.receipt.count({ where }),
    ]);

    const transformedReceipts = receipts.map((r) => ({
      id: r.id,
      customer: {
        id: r.user.id,
        email: r.user.email,
        name: r.user.name,
      },
      purchasedAt: r.purchasedAt.toISOString(),
      currency: r.currency,
      subtotal: Math.round(r.subtotal * 100),
      tax: Math.round(r.tax * 100),
      tip: Math.round(r.tip * 100),
      discount: Math.round(r.discount * 100),
      total: Math.round(r.total * 100),
      paymentMethod: r.paymentMethod,
      source: r.source,
      items: r.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: Math.round(item.unitPrice * 100),
        totalPrice: Math.round(item.totalPrice * 100),
        category: item.category,
      })),
    }));

    return mcpResponse(
      {
        data: transformedReceipts,
        merchant: {
          id: merchantConnection.merchantId,
          name: merchantName,
          provider: merchantConnection.provider,
        },
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
      "Failed to fetch merchant receipts",
      "internal_error",
      500,
      auth.requestId
    );
  }
}
