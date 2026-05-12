import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { getConnector } from "@/lib/connectors";
import type { ConnectorCredentials } from "@/lib/connectors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await params;

  const connections = await db.merchantConnection.findMany({
    where: { userId: session.user.id, provider, isActive: true },
  });

  if (connections.length === 0) {
    return NextResponse.json({ error: "No active connection" }, { status: 404 });
  }

  const connector = getConnector(provider);
  let totalImported = 0;

  for (const connection of connections) {
    let credentials: ConnectorCredentials = {
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken ?? "",
      expiresAt: connection.expiresAt ?? new Date(),
      merchantId: connection.merchantId,
      locationId: connection.locationId ?? undefined,
      metadata: (connection.metadata as Record<string, string>) ?? undefined,
    };

    if (connection.expiresAt && connection.expiresAt < new Date()) {
      credentials = await connector.refreshToken(credentials);
      await db.merchantConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          expiresAt: credentials.expiresAt,
        },
      });
    }

    const orders = await connector.fetchOrders(credentials, {
      since: connection.lastSyncAt ?? new Date(Date.now() - 30 * 86400000),
    });

    for (const order of orders) {
      const normalized = connector.normalizeOrder(order);

      const exists = await db.receipt.findFirst({
        where: {
          userId: session.user.id,
          source: "POS",
          merchantRawName: normalized.merchant.rawName,
          purchasedAt: normalized.purchase.purchasedAt
            ? new Date(normalized.purchase.purchasedAt)
            : undefined,
          total: normalized.purchase.total,
        },
      });

      if (exists) continue;

      await db.receipt.create({
        data: {
          userId: session.user.id,
          source: "POS",
          merchantRawName: normalized.merchant.rawName,
          merchantCanonicalName: normalized.merchant.canonicalName,
          merchantCategory: normalized.merchant.category,
          merchantLocation: normalized.merchant.location,
          purchasedAt: new Date(normalized.purchase.purchasedAt),
          currency: normalized.purchase.currency,
          subtotal: normalized.purchase.subtotal,
          tax: normalized.purchase.tax,
          tip: normalized.purchase.tip,
          discount: normalized.purchase.discount,
          fees: normalized.purchase.fees,
          total: normalized.purchase.total,
          paymentMethod: normalized.payment.method,
          cardLast4: normalized.payment.cardLast4,
          walletType: normalized.payment.walletType,
          confidence: normalized.metadata.confidence,
          requiresReview: normalized.metadata.requiresReview,
          items: {
            create: normalized.items.map((item) => ({
              rawName: item.rawName,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              category: item.category,
            })),
          },
        },
      });

      totalImported++;
    }

    await db.merchantConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });
  }

  return NextResponse.json({ imported: totalImported });
}
