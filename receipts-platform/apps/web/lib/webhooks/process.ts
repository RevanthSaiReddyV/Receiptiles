import { db } from "@receipts/db";
import type { JsonValue } from "@prisma/client/runtime/library";

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
    const merchantConn = await db.merchantConnection.findFirst({
      where: {
        provider: data.provider,
        isActive: true,
        merchantName: { contains: data.merchantName, mode: "insensitive" },
      },
    });
    userId = merchantConn?.userId ?? undefined;
  }

  // Card token matching — the key to frictionless receipt delivery.
  // If we have cardLast4 from the POS, find ALL users who registered that card
  // and deliver the receipt to each of them.
  if (!userId && data.cardLast4) {
    const matchingCards = await db.userCard.findMany({
      where: { last4: data.cardLast4 },
      select: { userId: true },
    });
    if (matchingCards.length === 1) {
      userId = matchingCards[0].userId;
    } else if (matchingCards.length > 1) {
      // Multiple users with same last4 — create receipt for all of them
      const receiptIds: string[] = [];
      for (const card of matchingCards) {
        const rid = await createReceiptForUser(card.userId, data);
        if (rid) receiptIds.push(rid);
      }
      await db.webhookEvent.create({
        data: {
          provider: data.provider,
          eventType: "receipt.multi_match",
          externalId: data.externalId,
          deviceId: data.deviceId,
          payload: data as unknown as object,
          status: "processed",
          receiptId: receiptIds[0] ?? null,
          processedAt: new Date(),
        },
      });
      return receiptIds[0] ?? null;
    }
  }

  if (!userId) {
    // Store unmatched receipt — can be claimed later when user adds this card
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

async function createReceiptForUser(userId: string, data: WebhookReceiptData): Promise<string | null> {
  const dup = await db.receipt.findFirst({
    where: {
      userId,
      merchantCanonicalName: data.merchantName,
      total: data.total,
      purchasedAt: {
        gte: new Date(data.purchasedAt.getTime() - 60000),
        lte: new Date(data.purchasedAt.getTime() + 60000),
      },
    },
  });
  if (dup) return dup.id;

  const receipt = await db.receipt.create({
    data: {
      userId,
      source: "POS",
      merchantRawName: data.merchantName,
      merchantCanonicalName: data.merchantName,
      merchantCategory: "Uncategorized",
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
  return receipt.id;
}

/**
 * When a user adds a new card, check for any pending unmatched receipts
 * that have the same cardLast4 and claim them for this user.
 */
export async function claimPendingReceipts(userId: string, cardLast4: string): Promise<number> {
  const pending = await db.webhookEvent.findMany({
    where: { status: "pending", eventType: "receipt.unmatched" },
  });

  let claimed = 0;
  for (const event of pending) {
    const payload = event.payload as JsonValue;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) continue;
    const p = payload as Record<string, JsonValue>;
    if (p.cardLast4 !== cardLast4) continue;

    const data: WebhookReceiptData = {
      provider: event.provider,
      externalId: event.externalId ?? event.id,
      merchantName: (p.merchantName as string) ?? "Unknown",
      merchantLocation: (p.merchantLocation as string) ?? undefined,
      items: Array.isArray(p.items) ? (p.items as WebhookReceiptData["items"]) : [],
      subtotal: (p.subtotal as number) ?? 0,
      tax: (p.tax as number) ?? 0,
      tip: (p.tip as number) ?? 0,
      discount: (p.discount as number) ?? 0,
      total: (p.total as number) ?? 0,
      currency: (p.currency as string) ?? "USD",
      paymentMethod: (p.paymentMethod as string) ?? "card",
      cardLast4,
      purchasedAt: new Date((p.purchasedAt as string) ?? Date.now()),
    };

    const receiptId = await createReceiptForUser(userId, data);
    if (receiptId) {
      await db.webhookEvent.update({
        where: { id: event.id },
        data: { status: "processed", receiptId, processedAt: new Date() },
      });
      claimed++;
    }
  }
  return claimed;
}
