import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";

/**
 * POST /api/mobile/claim
 * Claim an NFC-delivered receipt. Links it to the authenticated user.
 * Body: { claimToken }
 */
export async function POST(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { claimToken } = await request.json();

  if (!claimToken) {
    return NextResponse.json({ error: "claimToken required" }, { status: 400 });
  }

  // Find the NFC handover event
  const event = await db.webhookEvent.findFirst({
    where: {
      provider: "device",
      eventType: "nfc.handover",
      externalId: claimToken,
      status: "pending",
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Invalid or expired claim" }, { status: 404 });
  }

  const payload = event.payload as {
    expiresAt: string;
    receiptId?: string;
    transactionId?: string;
    claimed: boolean;
  };

  // Check expiry
  if (new Date(payload.expiresAt) < new Date()) {
    await db.webhookEvent.update({
      where: { id: event.id },
      data: { status: "failed", error: "Token expired" },
    });
    return NextResponse.json({ error: "Claim expired" }, { status: 410 });
  }

  if (payload.claimed) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  let receiptId = payload.receiptId;

  // If there's an existing receipt, assign it to this user
  if (receiptId) {
    const receipt = await db.receipt.findUnique({ where: { id: receiptId } });
    if (receipt && !receipt.userId) {
      // Unassigned receipt — claim it
      await db.receipt.update({
        where: { id: receiptId },
        data: { userId },
      });
    } else if (receipt && receipt.userId === userId) {
      // Already belongs to user — no-op
    } else if (!receipt) {
      receiptId = null;
    }
  }

  // If no receipt yet, check if there are unmatched events from this device
  if (!receiptId && event.deviceId) {
    const unmatchedEvents = await db.webhookEvent.findMany({
      where: {
        deviceId: event.deviceId,
        eventType: "receipt.unmatched",
        status: "pending",
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // last 5 min
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (unmatchedEvents.length > 0) {
      const unmatchedPayload = unmatchedEvents[0].payload as {
        merchantName: string;
        items: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number }>;
        subtotal: number;
        tax: number;
        tip: number;
        discount: number;
        total: number;
        currency: string;
        paymentMethod?: string;
        cardLast4?: string;
        purchasedAt?: string;
      };

      // Create receipt for this user
      const receipt = await db.receipt.create({
        data: {
          userId,
          source: "POS",
          merchantRawName: unmatchedPayload.merchantName,
          merchantCanonicalName: unmatchedPayload.merchantName,
          purchasedAt: unmatchedPayload.purchasedAt
            ? new Date(unmatchedPayload.purchasedAt)
            : new Date(),
          currency: unmatchedPayload.currency ?? "USD",
          subtotal: unmatchedPayload.subtotal,
          tax: unmatchedPayload.tax ?? 0,
          tip: unmatchedPayload.tip ?? 0,
          discount: unmatchedPayload.discount ?? 0,
          fees: 0,
          total: unmatchedPayload.total,
          paymentMethod: unmatchedPayload.paymentMethod ?? "card",
          cardLast4: unmatchedPayload.cardLast4,
          confidence: 1.0,
          requiresReview: false,
          items: {
            create: (unmatchedPayload.items ?? []).map((item) => ({
              rawName: item.name,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              category: "Uncategorized",
            })),
          },
        },
      });

      receiptId = receipt.id;

      // Mark unmatched event as processed
      await db.webhookEvent.update({
        where: { id: unmatchedEvents[0].id },
        data: { status: "processed", receiptId: receipt.id, processedAt: new Date() },
      });
    }
  }

  // Mark claim as used
  await db.webhookEvent.update({
    where: { id: event.id },
    data: {
      status: "processed",
      receiptId,
      processedAt: new Date(),
      payload: { ...payload, claimed: true, claimedBy: userId },
    },
  });

  return NextResponse.json({
    claimed: true,
    receiptId,
  });
}
