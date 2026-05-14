import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const WALGREENS_API = "https://www.walgreens.com/api/purchase-history/v1/receipts";

export const walgreensConnector: RetailerConnector = {
  id: "walgreens",
  name: "Walgreens",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Walgreens] Fetching receipts page ${page}`);

      try {
        const res = await fetch(
          `${WALGREENS_API}?page=${page}&pageSize=20&fromDate=${since.toISOString().split("T")[0]}`,
          {
            headers: {
              Cookie: auth.authToken,
              "x-wag-api-key": auth.clientId ?? "",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const receipts = data?.receipts ?? [];

        if (receipts.length === 0) break;

        for (const receipt of receipts) {
          allOrders.push(normalizeWalgreensReceipt(receipt));
        }

        page++;
        if (receipts.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[Walgreens] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeWalgreensReceipt(receipt: any): RetailerOrder {
  const items: RetailerOrderItem[] = (receipt.items ?? []).map((item: any) => ({
    name: item.description ?? item.itemName,
    sku: item.upc ?? item.sku,
    quantity: item.quantity || 1,
    unitPrice: item.price ?? 0,
    totalPrice: (item.price ?? 0) * (item.quantity || 1),
    category: "Health",
  }));

  const total = receipt.total ?? 0;
  const tax = receipt.tax ?? 0;

  return {
    orderId: `walgreens-${receipt.receiptId ?? receipt.transactionId}`,
    retailer: "walgreens",
    merchantName: receipt.storeName || "Walgreens",
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
