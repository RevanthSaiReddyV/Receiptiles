import { NextRequest } from "next/server";
import { db } from "@receipts/db";
import {
  validateMCPAuth,
  isMCPAuthError,
  mcpResponse,
  mcpError,
} from "@/lib/mcp-auth";

/**
 * GET /api/mcp/tools/receipt/[id]
 *
 * Get a single receipt with full details including all line items.
 * Requires scope: receipts:read
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateMCPAuth(req, "receipts:read");
  if (isMCPAuthError(auth)) return auth.response;

  const { id } = await params;

  if (!id) {
    return mcpError("Receipt ID is required", "invalid_request", 400, auth.requestId);
  }

  try {
    const receipt = await db.receipt.findFirst({
      where: {
        id,
        userId: auth.userId,
      },
      include: {
        items: true,
        card: {
          select: {
            id: true,
            name: true,
            last4: true,
            network: true,
            issuer: true,
          },
        },
      },
    });

    if (!receipt) {
      return mcpError("Receipt not found", "not_found", 404, auth.requestId);
    }

    const transformed = {
      id: receipt.id,
      merchant: {
        name: receipt.merchantCanonicalName,
        rawName: receipt.merchantRawName,
        category: receipt.merchantCategory,
        location: receipt.merchantLocation,
      },
      purchasedAt: receipt.purchasedAt.toISOString(),
      currency: receipt.currency,
      subtotal: Math.round(receipt.subtotal * 100),
      tax: Math.round(receipt.tax * 100),
      tip: Math.round(receipt.tip * 100),
      discount: Math.round(receipt.discount * 100),
      fees: Math.round(receipt.fees * 100),
      total: Math.round(receipt.total * 100),
      payment: {
        method: receipt.paymentMethod,
        cardLast4: receipt.cardLast4,
        walletType: receipt.walletType,
        entryMode: receipt.entryMode,
        card: receipt.card
          ? {
              id: receipt.card.id,
              name: receipt.card.name,
              last4: receipt.card.last4,
              network: receipt.card.network,
              issuer: receipt.card.issuer,
            }
          : null,
      },
      source: receipt.source,
      confidence: receipt.confidence,
      requiresReview: receipt.requiresReview,
      receiptUrl: receipt.receiptUrl,
      fileUrl: receipt.fileUrl,
      items: receipt.items.map((item) => ({
        id: item.id,
        name: item.name,
        rawName: item.rawName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Math.round(item.unitPrice * 100),
        totalPrice: Math.round(item.totalPrice * 100),
        category: item.category,
        sku: item.sku,
        productUrl: item.productUrl,
        imageUrl: item.imageUrl,
      })),
      createdAt: receipt.createdAt.toISOString(),
      updatedAt: receipt.updatedAt.toISOString(),
    };

    return mcpResponse({ data: transformed }, auth.requestId);
  } catch (err) {
    return mcpError(
      "Failed to fetch receipt",
      "internal_error",
      500,
      auth.requestId
    );
  }
}
