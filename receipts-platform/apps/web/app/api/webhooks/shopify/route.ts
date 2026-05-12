import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/webhooks/verify";
import { processWebhookReceipt } from "@/lib/webhooks/process";
import { db } from "@receipts/db";

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET!;

/**
 * POST /api/webhooks/shopify
 * Receives orders/paid events from Shopify.
 * Shopify sends the order object directly as body.
 * Topic comes via X-Shopify-Topic header.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");

  if (!signature || !SHOPIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const valid = verifyShopifyWebhook(body, signature, SHOPIFY_WEBHOOK_SECRET);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only process order paid/created
  if (topic !== "orders/paid" && topic !== "orders/create") {
    return NextResponse.json({ received: true });
  }

  const order = JSON.parse(body);

  try {
    // Resolve merchant — match by shop domain stored in metadata
    const merchantConn = await db.merchantConnection.findFirst({
      where: {
        provider: "shopify",
        isActive: true,
        OR: [
          { merchantId: shopDomain ?? "" },
          { metadata: { path: ["shop_domain"], equals: shopDomain ?? "" } },
        ],
      },
    });

    const items = (order.line_items ?? []).map(
      (item: { title: string; quantity: number; price: string; total_discount: string }) => ({
        name: item.title,
        quantity: item.quantity ?? 1,
        unitPrice: parseFloat(item.price ?? "0"),
        totalPrice: parseFloat(item.price ?? "0") * (item.quantity ?? 1) - parseFloat(item.total_discount ?? "0"),
      })
    );

    const total = parseFloat(order.total_price ?? "0");
    const subtotal = parseFloat(order.subtotal_price ?? "0");
    const tax = parseFloat(order.total_tax ?? "0");
    const discount = parseFloat(order.total_discounts ?? "0");

    // Payment gateway info
    const gateway = order.payment_gateway_names?.[0] ?? "unknown";
    const transaction = order.transactions?.[0];

    const receiptId = await processWebhookReceipt({
      provider: "shopify",
      externalId: `shopify_${order.id}`,
      merchantName: merchantConn?.merchantName ?? order.source_name ?? shopDomain ?? "Shopify Store",
      items,
      subtotal,
      tax,
      tip: 0,
      discount,
      total,
      currency: order.currency ?? "USD",
      paymentMethod: gateway,
      cardLast4: transaction?.payment_details?.credit_card_number?.slice(-4),
      purchasedAt: new Date(order.created_at),
      userId: merchantConn?.userId,
    });

    return NextResponse.json({ received: true, receiptId });
  } catch (error) {
    console.error("Shopify webhook processing error:", error);
    await db.webhookEvent.create({
      data: {
        provider: "shopify",
        eventType: topic ?? "orders/paid",
        externalId: `shopify_${order.id}`,
        payload: order,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}
