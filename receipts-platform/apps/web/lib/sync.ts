import { db } from "@receipts/db";
import { getConnector } from "@/lib/connectors";
import { getCustomerConnector } from "@/lib/connectors/customer";
import { scanEmailsForReceipts } from "@/lib/email/scanner";
import { notifyNewReceipts } from "@/lib/notifications";
import type { ConnectorCredentials } from "@/lib/connectors";
import type { CustomerCredentials } from "@/lib/connectors/customer";

export interface SyncResult {
  email: number;
  pos: number;
  customer: number;
  errors: string[];
}

export async function syncAllSources(userId: string): Promise<SyncResult> {
  const result: SyncResult = { email: 0, pos: 0, customer: 0, errors: [] };

  // 1. Scan emails for receipts
  try {
    result.email = await scanEmailsForReceipts(userId);
  } catch (e) {
    result.errors.push(`Email sync: ${e instanceof Error ? e.message : "failed"}`);
  }

  // 2. Sync POS/merchant connections
  const merchantConns = await db.merchantConnection.findMany({
    where: { userId, isActive: true },
  });

  for (const conn of merchantConns) {
    try {
      const connector = getConnector(conn.provider);
      let credentials: ConnectorCredentials = {
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken ?? "",
        expiresAt: conn.expiresAt ?? new Date(),
        merchantId: conn.merchantId,
        locationId: conn.locationId ?? undefined,
        metadata: (conn.metadata as Record<string, string>) ?? undefined,
      };

      if (conn.expiresAt && conn.expiresAt < new Date()) {
        credentials = await connector.refreshToken(credentials);
        await db.merchantConnection.update({
          where: { id: conn.id },
          data: {
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken,
            expiresAt: credentials.expiresAt,
          },
        });
      }

      const orders = await connector.fetchOrders(credentials, {
        since: conn.lastSyncAt ?? new Date(Date.now() - 7 * 86400000),
      });

      for (const order of orders) {
        const normalized = connector.normalizeOrder(order);
        const exists = await db.receipt.findFirst({
          where: {
            userId,
            source: "POS",
            merchantRawName: normalized.merchant.rawName,
            purchasedAt: new Date(normalized.purchase.purchasedAt),
            total: normalized.purchase.total,
          },
        });
        if (exists) continue;

        await db.receipt.create({
          data: {
            userId,
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
        result.pos++;
      }

      await db.merchantConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date() },
      });
    } catch (e) {
      result.errors.push(`${conn.provider}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  // 3. Sync customer connections (PayPal, etc.)
  const customerConns = await db.customerConnection.findMany({
    where: { userId, isActive: true },
  });

  for (const conn of customerConns) {
    try {
      const connector = getCustomerConnector(conn.provider);
      let credentials: CustomerCredentials = {
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken ?? "",
        expiresAt: conn.expiresAt ?? new Date(),
        accountId: conn.accountId,
        email: conn.email ?? undefined,
        metadata: (conn.metadata as Record<string, string>) ?? undefined,
      };

      if (conn.expiresAt && conn.expiresAt < new Date()) {
        credentials = await connector.refreshToken(credentials);
        await db.customerConnection.update({
          where: { id: conn.id },
          data: {
            accessToken: credentials.accessToken,
            refreshToken: credentials.refreshToken,
            expiresAt: credentials.expiresAt,
          },
        });
      }

      const transactions = await connector.fetchTransactions(credentials, {
        since: conn.lastSyncAt ?? new Date(Date.now() - 7 * 86400000),
      });

      for (const tx of transactions) {
        if (tx.status !== "completed") continue;
        const normalized = connector.normalizeTransaction(tx);

        const exists = await db.receipt.findFirst({
          where: {
            userId,
            source: "PROCESSOR",
            merchantRawName: normalized.merchant.rawName,
            purchasedAt: new Date(normalized.purchase.purchasedAt),
            total: normalized.purchase.total,
          },
        });
        if (exists) continue;

        await db.receipt.create({
          data: {
            userId,
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
        result.customer++;
      }

      await db.customerConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date() },
      });
    } catch (e) {
      result.errors.push(`${conn.provider}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  // Send push notification if new receipts were imported
  const totalImported = result.email + result.pos + result.customer;
  if (totalImported > 0) {
    notifyNewReceipts(userId, totalImported).catch(() => {});
  }

  return result;
}
