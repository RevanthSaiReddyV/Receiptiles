import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { costcoConnector } from "@/lib/connectors/retailers/costco";

export const maxDuration = 300;

/**
 * GET /api/cron/retailer-sync
 * Automated sync for all active retailer connections.
 * Runs daily via Vercel Cron.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await db.retailerConnection.findMany({
    where: { isActive: true },
  });

  const results: Array<{ userId: string; retailer: string; imported: number; error?: string }> = [];

  for (const conn of connections) {
    try {
      const since = conn.lastSyncAt
        ? new Date(conn.lastSyncAt.getTime() - 7 * 86400000)
        : new Date(Date.now() - 5 * 365 * 86400000);

      let orders;
      if (conn.retailer === "costco") {
        orders = await costcoConnector.fetchOrders(
          { authToken: conn.authToken, clientId: conn.clientId ?? undefined },
          since
        );
      } else {
        results.push({ userId: conn.userId, retailer: conn.retailer, imported: 0, error: "Unsupported retailer" });
        continue;
      }

      let imported = 0;
      for (const order of orders) {
        const exists = await db.receipt.findFirst({
          where: {
            userId: conn.userId,
            ocrText: { contains: order.orderId },
          },
        });
        if (exists) continue;

        const dupByAmount = await db.receipt.findFirst({
          where: {
            userId: conn.userId,
            merchantCanonicalName: { contains: "Costco", mode: "insensitive" },
            total: order.total,
            purchasedAt: {
              gte: new Date(order.purchasedAt.getTime() - 86400000),
              lte: new Date(order.purchasedAt.getTime() + 86400000),
            },
          },
        });
        if (dupByAmount) continue;

        await db.receipt.create({
          data: {
            userId: conn.userId,
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
            ocrText: `retailer:${order.orderId}`,
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
      }

      await db.retailerConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date() },
      });

      results.push({ userId: conn.userId, retailer: conn.retailer, imported });
    } catch (err) {
      results.push({
        userId: conn.userId,
        retailer: conn.retailer,
        imported: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    synced: connections.length,
    results,
  });
}
