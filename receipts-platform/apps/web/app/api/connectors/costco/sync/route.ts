import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { costcoConnector } from "@/lib/connectors/retailers/costco";

export const maxDuration = 120;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await db.retailerConnection.findUnique({
    where: { userId_retailer: { userId: session.user.id, retailer: "costco" } },
  });

  if (!connection || !connection.isActive) {
    return NextResponse.json({ error: "Costco not connected" }, { status: 400 });
  }

  // First sync: 5 years back. Subsequent: from last sync minus 7 days overlap
  const since = connection.lastSyncAt
    ? new Date(connection.lastSyncAt.getTime() - 7 * 86400000)
    : new Date(Date.now() - 5 * 365 * 86400000);
  let imported = 0;
  const logs: string[] = [];

  try {
    const orders = await costcoConnector.fetchOrders(
      { authToken: connection.authToken, clientId: connection.clientId ?? undefined },
      since
    );

    logs.push(`Fetched ${orders.length} Costco receipts`);

    for (const order of orders) {
      const exists = await db.receipt.findFirst({
        where: {
          userId: session.user.id,
          merchantCanonicalName: { contains: "Costco", mode: "insensitive" },
          total: order.total,
          purchasedAt: {
            gte: new Date(order.purchasedAt.getTime() - 86400000),
            lte: new Date(order.purchasedAt.getTime() + 86400000),
          },
        },
      });

      if (exists) {
        logs.push(`  [${order.purchasedAt.toLocaleDateString()}] $${order.total} — already imported`);
        continue;
      }

      await db.receipt.create({
        data: {
          userId: session.user.id,
          source: "PROCESSOR",
          merchantRawName: order.merchantName,
          merchantCanonicalName: "Costco",
          merchantCategory: "Groceries",
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
          ocrText: `retailer:costco:${order.orderId}`,
          items: {
            create: order.items.map(item => ({
              rawName: item.name,
              name: item.name,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              category: "Groceries",
            })),
          },
        },
      });

      imported++;
      logs.push(`  [${order.purchasedAt.toLocaleDateString()}] $${order.total} — SAVED (${order.items.length} items)`);
    }

    await db.retailerConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });

    logs.push(`Done. Imported ${imported} new receipts.`);
    return NextResponse.json({ imported, total: orders.length, logs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`Error: ${msg}`);
    return NextResponse.json({ error: msg, logs }, { status: 500 });
  }
}
