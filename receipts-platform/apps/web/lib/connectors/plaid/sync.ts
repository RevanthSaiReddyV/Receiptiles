import { plaidClient } from "./client";
import { CountryCode, Products } from "plaid";
import { db } from "@receipts/db";

export async function createLinkToken(userId: string) {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: "Receiptiles",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return response.data.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

export async function syncTransactions(userId: string, accessToken: string, cursor?: string) {
  const response = await plaidClient.transactionsSync({
    access_token: accessToken,
    cursor: cursor || undefined,
  });

  const { added, modified, removed, next_cursor, has_more } = response.data;

  const purchases = added.map((txn) => ({
    customerId: userId,
    merchantName: txn.merchant_name ?? txn.name ?? "Unknown",
    total: Math.abs(txn.amount),
    currency: txn.iso_currency_code ?? "USD",
    purchasedAt: new Date(txn.authorized_date ?? txn.date),
    source: "plaid" as const,
    category: txn.personal_finance_category?.primary ?? null,
    metadata: {
      plaid_transaction_id: txn.transaction_id,
      plaid_merchant_id: txn.merchant_entity_id,
      store_number: txn.location?.store_number,
      city: txn.location?.city,
      region: txn.location?.region,
      payment_channel: txn.payment_channel,
      logo_url: txn.logo_url,
      pending: txn.pending,
    },
  }));

  return {
    purchases,
    removedIds: removed.map((r) => r.transaction_id),
    modifiedIds: modified.map((m) => m.transaction_id),
    nextCursor: next_cursor,
    hasMore: has_more,
  };
}

export async function matchTransactionToReceipt(
  userId: string,
  merchantName: string,
  amount: number,
  date: Date
) {
  const dateWindow = 3;
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - dateWindow);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + dateWindow);

  const candidates = await db.receipt.findMany({
    where: {
      userId,
      purchasedAt: { gte: startDate, lte: endDate },
      total: { gte: amount - 1, lte: amount + 1 },
    },
    select: {
      id: true,
      merchantCanonicalName: true,
      total: true,
      purchasedAt: true,
    },
  });

  if (candidates.length === 0) return null;

  let bestMatch: (typeof candidates)[0] | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    let score = 0;

    // Amount match
    if (Math.abs(candidate.total - amount) < 0.01) score += 50;
    else if (Math.abs(candidate.total - amount) < 1.0) score += 20;

    // Date match
    const daysDiff = Math.abs(
      (candidate.purchasedAt.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff < 1) score += 30;
    else if (daysDiff <= 1) score += 20;
    else if (daysDiff <= 3) score += 10;

    // Merchant name fuzzy match (token-based Jaccard)
    const tokensA = new Set(merchantName.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/));
    const tokensB = new Set(candidate.merchantCanonicalName.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/));
    const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
    const union = new Set([...tokensA, ...tokensB]).size;
    const jaccard = union > 0 ? intersection / union : 0;
    score += jaccard * 20;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestScore >= 60 ? bestMatch : null;
}
