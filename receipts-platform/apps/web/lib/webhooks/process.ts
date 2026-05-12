import { db } from "@receipts/db";

interface WebhookReceiptData {
  provider: string;
  externalId: string;
  merchantName: string;
  merchantLocation?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category?: string;
  }>;
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  cardLast4?: string;
  purchasedAt: Date;
  userId?: string; // If we can resolve the user (e.g., from merchant connection)
  deviceId?: string;
}

/**
 * Process a webhook event into a receipt.
 * Handles deduplication, user resolution, and receipt creation.
 */
export async function processWebhookReceipt(data: WebhookReceiptData): Promise<string | null> {
  // Dedup: check if we already processed this event
  const existing = await db.webhookEvent.findFirst({
    where: {
      provider: data.provider,
      externalId: data.externalId,
      status: "processed",
    },
  });

  if (existing) {
    return existing.receiptId;
  }

  // Resolve user from merchant connection if not directly provided
  let userId = data.userId;
  if (!userId && data.deviceId) {
    const device = await db.device.findUnique({ where: { id: data.deviceId } });
    if (device?.merchantId) {
      const conn = await db.merchantConnection.findFirst({
        where: { merchantId: device.merchantId, isActive: true },
      });
      userId = conn?.userId ?? undefined;
    }
  }

  if (!userId) {
    // Try to match by merchant name + provider from active connections
    const merchantConn = await db.merchantConnection.findFirst({
      where: {
        provider: data.provider,
        isActive: true,
        merchantName: { contains: data.merchantName, mode: "insensitive" },
      },
    });
    userId = merchantConn?.userId ?? undefined;
  }

  if (!userId) {
    // Cannot attribute this receipt to any user — store event for later matching
    await db.webhookEvent.create({
      data: {
        provider: data.provider,
        eventType: "receipt.unmatched",
        externalId: data.externalId,
        deviceId: data.deviceId,
        payload: data as unknown as object,
        status: "pending",
      },
    });
    return null;
  }

  // Dedup check on receipt level
  const dupReceipt = await db.receipt.findFirst({
    where: {
      userId,
      merchantCanonicalName: data.merchantName,
      total: data.total,
      purchasedAt: {
        gte: new Date(data.purchasedAt.getTime() - 60000), // within 1 minute
        lte: new Date(data.purchasedAt.getTime() + 60000),
      },
    },
  });

  if (dupReceipt) {
    await db.webhookEvent.create({
      data: {
        provider: data.provider,
        eventType: "receipt.duplicate",
        externalId: data.externalId,
        deviceId: data.deviceId,
        payload: data as unknown as object,
        status: "skipped",
        receiptId: dupReceipt.id,
      },
    });
    return dupReceipt.id;
  }

  // Create the receipt
  const receipt = await db.receipt.create({
    data: {
      userId,
      source: "POS",
      merchantRawName: data.merchantName,
      merchantCanonicalName: data.merchantName,
      merchantLocation: data.merchantLocation,
      purchasedAt: data.purchasedAt,
      currency: data.currency,
      subtotal: data.subtotal,
      tax: data.tax,
      tip: data.tip,
      discount: data.discount,
      fees: 0,
      total: data.total,
      paymentMethod: data.paymentMethod ?? "card",
      cardLast4: data.cardLast4,
      confidence: 1.0,
      requiresReview: false,
      items: {
        create: data.items.map((item) => ({
          rawName: item.name,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          category: item.category ?? "Uncategorized",
        })),
      },
    },
  });

  // Record the webhook event
  await db.webhookEvent.create({
    data: {
      provider: data.provider,
      eventType: "receipt.created",
      externalId: data.externalId,
      deviceId: data.deviceId,
      payload: data as unknown as object,
      status: "processed",
      receiptId: receipt.id,
      processedAt: new Date(),
    },
  });

  return receipt.id;
}
