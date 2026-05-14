import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";

export async function POST(request: NextRequest) {
  let body: {
    walletId: string;
    receiptData: {
      merchant: string;
      items: Array<{
        name: string;
        quantity?: number;
        unitPrice: number;
        totalPrice: number;
        category?: string;
      }>;
      total: number;
      subtotal?: number;
      tax?: number;
      tip?: number;
      discount?: number;
      currency?: string;
      paymentMethod?: string;
      purchasedAt?: string;
      merchantCategory?: string;
      merchantLocation?: string;
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { walletId, receiptData } = body;

  if (!walletId || !receiptData) {
    return NextResponse.json(
      { error: "walletId and receiptData are required" },
      { status: 400 }
    );
  }

  if (!receiptData.merchant || !receiptData.items || !receiptData.total) {
    return NextResponse.json(
      { error: "receiptData must include merchant, items, and total" },
      { status: 400 }
    );
  }

  // Look up user by walletId
  const wallet = await db.receiptWallet.findUnique({
    where: { walletId },
    select: { userId: true, id: true },
  });

  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet not found" },
      { status: 404 }
    );
  }

  // Create the receipt
  const subtotal =
    receiptData.subtotal ??
    receiptData.items.reduce((sum, item) => sum + item.totalPrice, 0);

  const receipt = await db.receipt.create({
    data: {
      userId: wallet.userId,
      source: "POS",
      merchantRawName: receiptData.merchant,
      merchantCanonicalName: receiptData.merchant,
      merchantCategory: receiptData.merchantCategory ?? "Uncategorized",
      merchantLocation: receiptData.merchantLocation ?? null,
      purchasedAt: receiptData.purchasedAt
        ? new Date(receiptData.purchasedAt)
        : new Date(),
      currency: receiptData.currency ?? "USD",
      subtotal,
      tax: receiptData.tax ?? 0,
      tip: receiptData.tip ?? 0,
      discount: receiptData.discount ?? 0,
      total: receiptData.total,
      paymentMethod: receiptData.paymentMethod ?? "unknown",
      confidence: 1.0,
      items: {
        create: receiptData.items.map((item) => ({
          rawName: item.name,
          name: item.name,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          category: item.category ?? "Uncategorized",
        })),
      },
    },
  });

  // Update wallet stats
  await db.receiptWallet.update({
    where: { id: wallet.id },
    data: {
      totalReceipts: { increment: 1 },
      totalSpent: { increment: receiptData.total },
      lastActivityAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    receiptId: receipt.id,
  });
}
