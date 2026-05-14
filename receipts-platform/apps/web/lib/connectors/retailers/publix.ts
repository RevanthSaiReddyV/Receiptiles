import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const PUBLIX_API = "https://services.publix.com/api/v1/purchase-history";

export const publixConnector: RetailerConnector = {
  id: "publix",
  name: "Publix",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Publix] Fetching receipts page ${page}`);

      try {
        const res = await fetch(
          `${PUBLIX_API}?page=${page}&limit=20&since=${since.toISOString()}`,
          {
            headers: {
              Authorization: `Bearer ${auth.authToken}`,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const receipts = data?.receipts ?? data?.data ?? [];

        if (receipts.length === 0) break;

        for (const receipt of receipts) {
          allOrders.push(normalizePublixReceipt(receipt));
        }

        page++;
        if (receipts.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[Publix] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizePublixReceipt(receipt: any): RetailerOrder {
  const items: RetailerOrderItem[] = (receipt.items ?? []).map((item: any) => ({
    name: item.description ?? item.name,
    sku: item.upc,
    quantity: item.quantity || 1,
    unitPrice: item.price ?? 0,
    totalPrice: (item.price ?? 0) * (item.quantity || 1),
    category: "Groceries",
  }));

  const total = receipt.total ?? 0;
  const tax = receipt.tax ?? 0;

  return {
    orderId: `publix-${receipt.receiptId ?? receipt.transactionId}`,
    retailer: "publix",
    merchantName: receipt.storeName || "Publix",
    merchantLocation: receipt.storeNumber ? `Store #${receipt.storeNumber}` : undefined,
    purchasedAt: new Date(receipt.transactionDate ?? receipt.date),
    items,
    subtotal: total - tax,
    tax,
    total,
    currency: "USD",
    paymentMethod: receipt.payment?.type?.toLowerCase() ?? "card",
    cardLast4: receipt.payment?.lastFour,
    rawData: receipt,
  };
}
