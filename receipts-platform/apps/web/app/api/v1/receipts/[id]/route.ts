import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@receipts/db";

/**
 * GET /api/v1/receipts/:id
 * Get a single receipt by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const receipt = await db.receipt.findFirst({
    where: { id, userId: auth.userId },
    include: { items: true },
  });

  if (!receipt) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Receipt not found." } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: {
      id: receipt.id,
      source: receipt.source,
      fileUrl: receipt.fileUrl,
      merchant: {
        name: receipt.merchantCanonicalName,
        rawName: receipt.merchantRawName,
        category: receipt.merchantCategory,
        location: receipt.merchantLocation,
      },
      purchase: {
        date: receipt.purchasedAt,
        currency: receipt.currency,
        subtotal: receipt.subtotal,
        tax: receipt.tax,
        tip: receipt.tip,
        discount: receipt.discount,
        fees: receipt.fees,
        total: receipt.total,
      },
      payment: {
        method: receipt.paymentMethod,
        cardLast4: receipt.cardLast4,
        walletType: receipt.walletType,
        entryMode: receipt.entryMode,
      },
      items: receipt.items.map((item) => ({
        id: item.id,
        name: item.name,
        rawName: item.rawName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        category: item.category,
      })),
      confidence: receipt.confidence,
      requiresReview: receipt.requiresReview,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
    },
  });
}
