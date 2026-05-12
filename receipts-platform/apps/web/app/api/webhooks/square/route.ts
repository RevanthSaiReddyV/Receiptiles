import { NextRequest, NextResponse } from "next/server";
import { verifySquareWebhook } from "@/lib/webhooks/verify";
import { processWebhookReceipt } from "@/lib/webhooks/process";
import { db } from "@receipts/db";

const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!;
const SQUARE_WEBHOOK_URL = process.env.NEXTAUTH_URL + "/api/webhooks/square";

/**
 * POST /api/webhooks/square
 * Receives payment.completed events from Square.
 * Square sends: { merchant_id, type, event_id, data: { object: { payment: {...} } } }
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");

  if (!signature || !SQUARE_WEBHOOK_SIGNATURE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify signature
  const valid = verifySquareWebhook(
    body,
    signature,
    SQUARE_WEBHOOK_SIGNATURE_KEY,
    SQUARE_WEBHOOK_URL
  );

  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  // Only process payment.completed and order.fulfillment.updated
  if (!["payment.completed", "order.fulfillment.updated"].includes(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    const payment = event.data?.object?.payment;
    if (!payment) {
      return NextResponse.json({ received: true });
    }

    // Resolve merchant from connection
    const merchantConn = await db.merchantConnection.findFirst({
      where: {
        provider: "square",
        merchantId: event.merchant_id,
        isActive: true,
      },
    });

    // Fetch order details if we have an order_id
    let orderItems: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    if (payment.order_id && merchantConn) {
      try {
        const orderRes = await fetch(
          `https://connect.squareup.com/v2/orders/${payment.order_id}`,
          {
            headers: {
              Authorization: `Bearer ${merchantConn.accessToken}`,
              "Square-Version": "2024-01-18",
            },
          }
        );
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          orderItems = (orderData.order?.line_items ?? []).map(
            (item: { name: string; quantity: string; base_price_money?: { amount: number }; total_money?: { amount: number } }) => ({
              name: item.name,
              quantity: parseInt(item.quantity) || 1,
              unitPrice: (item.base_price_money?.amount ?? 0) / 100,
              totalPrice: (item.total_money?.amount ?? 0) / 100,
            })
          );
        }
      } catch {
        // Continue without line items
      }
    }

    const totalCents = payment.total_money?.amount ?? 0;
    const taxCents = payment.tax_money?.amount ?? 0;
    const tipCents = payment.tip_money?.amount ?? 0;

    const receiptId = await processWebhookReceipt({
      provider: "square",
      externalId: event.event_id ?? payment.id,
      merchantName: merchantConn?.merchantName ?? "Square Merchant",
      merchantLocation: payment.location_id,
      items: orderItems,
      subtotal: (totalCents - taxCents - tipCents) / 100,
      tax: taxCents / 100,
      tip: tipCents / 100,
      discount: 0,
      total: totalCents / 100,
      currency: payment.total_money?.currency ?? "USD",
      paymentMethod: payment.card_details ? "card" : payment.source_type ?? "unknown",
      cardLast4: payment.card_details?.card?.last_4,
      purchasedAt: new Date(payment.created_at ?? event.created_at),
      userId: merchantConn?.userId,
    });

    return NextResponse.json({ received: true, receiptId });
  } catch (error) {
    console.error("Square webhook processing error:", error);
    // Still return 200 to prevent retries for processing errors
    await db.webhookEvent.create({
      data: {
        provider: "square",
        eventType: event.type,
        externalId: event.event_id,
        payload: event,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}
