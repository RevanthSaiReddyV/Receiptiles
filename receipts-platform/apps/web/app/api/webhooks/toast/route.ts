import { NextRequest, NextResponse } from "next/server";
import { verifyToastWebhook } from "@/lib/webhooks/verify";
import { processWebhookReceipt } from "@/lib/webhooks/process";
import { db } from "@receipts/db";

const TOAST_WEBHOOK_SECRET = process.env.TOAST_WEBHOOK_SECRET!;

/**
 * POST /api/webhooks/toast
 * Receives order events from Toast POS.
 * Toast sends: { eventType, toastGuid, restaurantGuid, order: {...} }
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-toast-signature");

  if (!signature || !TOAST_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const valid = verifyToastWebhook(body, signature, TOAST_WEBHOOK_SECRET);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  // Only process completed orders
  if (event.eventType !== "ORDER_PAID" && event.eventType !== "ORDER_CLOSED") {
    return NextResponse.json({ received: true });
  }

  try {
    const order = event.order;
    if (!order) {
      return NextResponse.json({ received: true });
    }

    // Resolve merchant from Toast restaurant GUID
    const merchantConn = await db.merchantConnection.findFirst({
      where: {
        provider: "toast",
        merchantId: event.restaurantGuid,
        isActive: true,
      },
    });

    const items = (order.checks ?? []).flatMap(
      (check: { selections?: Array<{ displayName: string; quantity: number; price: number; preModifier?: number }> }) =>
        (check.selections ?? []).map((sel) => ({
          name: sel.displayName,
          quantity: sel.quantity ?? 1,
          unitPrice: (sel.price ?? 0) / 100,
          totalPrice: ((sel.price ?? 0) * (sel.quantity ?? 1)) / 100,
        }))
    );

    const totalAmount = order.totalAmount ?? 0;
    const taxAmount = order.taxAmount ?? 0;
    const tipAmount = order.tipAmount ?? 0;
    const discountAmount = order.discountAmount ?? 0;

    // Payment info from first payment
    const payment = order.payments?.[0];
    const cardLast4 = payment?.cardLast4 ?? payment?.otherPayment?.last4;

    const receiptId = await processWebhookReceipt({
      provider: "toast",
      externalId: event.toastGuid ?? order.guid,
      merchantName: merchantConn?.merchantName ?? order.restaurantName ?? "Toast Restaurant",
      merchantLocation: order.revenueCenterName,
      items,
      subtotal: (totalAmount - taxAmount - tipAmount + discountAmount) / 100,
      tax: taxAmount / 100,
      tip: tipAmount / 100,
      discount: discountAmount / 100,
      total: totalAmount / 100,
      currency: "USD", // Toast is US-only
      paymentMethod: payment?.type ?? "card",
      cardLast4,
      purchasedAt: new Date(order.closedDate ?? order.paidDate ?? order.createdDate),
      userId: merchantConn?.userId,
    });

    return NextResponse.json({ received: true, receiptId });
  } catch (error) {
    console.error("Toast webhook processing error:", error);
    await db.webhookEvent.create({
      data: {
        provider: "toast",
        eventType: event.eventType,
        externalId: event.toastGuid,
        payload: event,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}
