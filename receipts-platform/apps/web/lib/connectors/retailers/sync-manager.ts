import { db } from "@receipts/db";
import { costcoConnector } from "./costco";
import type { RetailerAuth, RetailerOrder } from "./types";

interface SyncResult {
  retailer: string;
  newOrders: number;
  totalFetched: number;
  error?: string;
}

export async function syncRetailer(
  userId: string,
  connection: { id: string; retailer: string; authToken: string; clientId: string | null; lastSyncAt: Date | null }
): Promise<SyncResult> {
  const since = connection.lastSyncAt
    ? new Date(connection.lastSyncAt.getTime() - 7 * 86400000)
    : new Date(Date.now() - 5 * 365 * 86400000);

  const auth: RetailerAuth = {
    authToken: connection.authToken,
    clientId: connection.clientId ?? undefined,
  };

  let orders: RetailerOrder[] = [];

  try {
    switch (connection.retailer) {
      case "costco":
        orders = await costcoConnector.fetchOrders(auth, since);
        break;
      default:
        return { retailer: connection.retailer, newOrders: 0, totalFetched: 0, error: "Unsupported retailer" };
    }
  } catch (err) {
    return {
      retailer: connection.retailer,
      newOrders: 0,
      totalFetched: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let newOrders = 0;

  for (const order of orders) {
    const exists = await db.receipt.findFirst({
      where: {
        userId,
        ocrText: { contains: order.orderId },
      },
    });
    if (exists) continue;

    await db.receipt.create({
      data: {
        userId,
        source: "PROCESSOR",
        merchantRawName: order.merchantName,
        merchantCanonicalName: order.retailer === "costco" ? "Costco" : order.merchantName,
        merchantCategory: "Shopping",
        merchantLocation: order.merchantLocation,
        purchasedAt: order.purchasedAt,
        currency: order.currency,
        subtotal: order.subtotal,
        tax: order.tax,
        tip: 0,
        discount: 0,
        fees: 0,
        total: order.total,
        paymentMethod: order.paymentMethod ?? "card",
        cardLast4: order.cardLast4,
        confidence: 1.0,
        requiresReview: false,
        ocrText: `retailer:${order.orderId}`,
        items: {
          create: order.items.map(item => ({
            rawName: item.name,
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            category: item.category ?? "Shopping",
          })),
        },
      },
    });
    newOrders++;
  }

  await db.retailerConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: new Date() },
  });

  return { retailer: connection.retailer, newOrders, totalFetched: orders.length };
}

export async function syncAllRetailers(userId: string): Promise<SyncResult[]> {
  const connections = await db.retailerConnection.findMany({
    where: { userId, isActive: true },
  });

  const results: SyncResult[] = [];

  for (const conn of connections) {
    const result = await syncRetailer(userId, conn);
    results.push(result);
  }

  return results;
}
