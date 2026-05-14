import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

// Trader Joe's doesn't have a digital receipt API (no loyalty program)
// This connector works via receipt email forwarding or manual upload
// We use it as a placeholder that can work with our AI-powered receipt parser
const TJ_PARSE_ENDPOINT = "/api/receipts/parse";

export const traderJoesConnector: RetailerConnector = {
  id: "trader-joes",
  name: "Trader Joe's",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    // Trader Joe's doesn't offer digital receipts through an API
    // Orders come in through:
    // 1. Email forwarding (if receipt was emailed)
    // 2. Photo/scan upload
    // 3. Bank transaction matching
    // This connector fetches any previously imported TJ receipts
    console.log(`[TraderJoes] No direct API - receipts come via upload/email/bank matching`);

    try {
      const res = await fetch(
        `${auth.metadata?.apiBase ?? ""}/api/mobile/receipts?retailer=trader-joes&since=${since.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${auth.authToken}`,
          },
        }
      );

      if (!res.ok) return [];

      const data = await res.json();
      return (data?.receipts ?? []).map(normalizeTJReceipt);
    } catch {
      return [];
    }
  },
};

function normalizeTJReceipt(receipt: any): RetailerOrder {
  const items: RetailerOrderItem[] = (receipt.items ?? []).map((item: any) => ({
    name: item.name ?? item.description,
    sku: item.sku,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice ?? item.price ?? 0,
    totalPrice: item.totalPrice ?? (item.price ?? 0) * (item.quantity || 1),
    category: "Groceries",
  }));

  return {
    orderId: `traderjoes-${receipt.id}`,
    retailer: "trader-joes",
    merchantName: "Trader Joe's",
    merchantLocation: receipt.storeLocation,
    purchasedAt: new Date(receipt.purchasedAt ?? receipt.date),
    items,
    subtotal: receipt.subtotal ?? receipt.total - (receipt.tax ?? 0),
    tax: receipt.tax ?? 0,
    total: receipt.total ?? 0,
    currency: "USD",
    paymentMethod: receipt.paymentMethod ?? "card",
    cardLast4: receipt.cardLast4,
    rawData: receipt,
  };
}
