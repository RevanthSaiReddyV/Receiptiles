import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { getCustomerConnector } from "@/lib/connectors/customer";
import type { CustomerCredentials } from "@/lib/connectors/customer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await params;

  const connections = await db.customerConnection.findMany({
    where: { userId: session.user.id, provider, isActive: true },
  });

  if (connections.length === 0) {
    return NextResponse.json({ error: "No active connection" }, { status: 404 });
  }

  const connector = getCustomerConnector(provider);
  let totalImported = 0;

  for (const connection of connections) {
    let credentials: CustomerCredentials = {
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken ?? "",
      expiresAt: connection.expiresAt ?? new Date(),
      accountId: connection.accountId,
      email: connection.email ?? undefined,
      metadata: (connection.metadata as Record<string, string>) ?? undefined,
    };

    if (connection.expiresAt && connection.expiresAt < new Date()) {
      credentials = await connector.refreshToken(credentials);
      await db.customerConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          expiresAt: credentials.expiresAt,
        },
      });
    }

    const transactions = await connector.fetchTransactions(credentials, {
      since: connection.lastSyncAt ?? new Date(Date.now() - 30 * 86400000),
    });

    for (const tx of transactions) {
      if (tx.status !== "completed") continue;

      const normalized = connector.normalizeTransaction(tx);

      const exists = await db.receipt.findFirst({
        where: {
          userId: session.user.id,
          source: "PROCESSOR",
          merchantRawName: normalized.merchant.rawName,
          purchasedAt: new Date(normalized.purchase.purchasedAt),
          total: normalized.purchase.total,
        },
      });

      if (exists) continue;

      await db.receipt.create({
        data: {
          userId: session.user.id,
          source: "PROCESSOR",
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

    await db.customerConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });
  }

  return NextResponse.json({ imported: totalImported });
}
