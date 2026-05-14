import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

// Safeway/Albertsons uses the J4U (Just for U) loyalty API
const SAFEWAY_API = "https://www.safeway.com/abs/pub/xapi/pgm/purchasehistory/v1";

export const safewayConnector: RetailerConnector = {
  id: "safeway",
  name: "Safeway / Albertsons",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Safeway] Fetching purchase history page ${page}`);

      try {
        const res = await fetch(
          `${SAFEWAY_API}?page=${page}&size=20&startDate=${since.toISOString().split("T")[0]}`,
          {
            headers: {
              Cookie: auth.authToken,
              "Ocp-Apim-Subscription-Key": auth.clientId ?? "",
              "SWY_SSO_TOKEN": auth.metadata?.ssoToken ?? "",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const receipts = data?.purchaseHistory ?? data?.receipts ?? [];

        if (receipts.length === 0) break;

        for (const receipt of receipts) {
          allOrders.push(normalizeSafewayReceipt(receipt));
        }

        page++;
        if (receipts.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[Safeway] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeSafewayReceipt(receipt: any): RetailerOrder {
  const items: RetailerOrderItem[] = (receipt.items ?? receipt.lineItems ?? []).map((item: any) => ({
    name: item.description ?? item.itemName,
    sku: item.upc ?? item.sku,
    quantity: item.quantity || 1,
    unitPrice: item.price ?? item.unitPrice ?? 0,
    totalPrice: item.extendedPrice ?? (item.price ?? 0) * (item.quantity || 1),
    category: "Groceries",
  }));

  const total = receipt.total ?? receipt.grandTotal ?? 0;
  const tax = receipt.tax ?? receipt.taxTotal ?? 0;

  return {
    orderId: `safeway-${receipt.receiptId ?? receipt.transactionId}`,
    retailer: "safeway",
    merchantName: receipt.storeName || receipt.banner || "Safeway",
    merchantLocation: receipt.storeId ? `Store #${receipt.storeId}` : undefined,
    purchasedAt: new Date(receipt.transactionDate ?? receipt.date),
    items,
    subtotal: total - tax,
    tax,
    total,
    currency: "USD",
    paymentMethod: receipt.tender?.type?.toLowerCase() ?? "card",
    cardLast4: receipt.tender?.lastFour,
    rawData: receipt,
  };
}
