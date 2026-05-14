import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const SAMS_API = "https://www.samsclub.com/api/node/vivaldi/browse/v2/purchase-history";

export const samsClubConnector: RetailerConnector = {
  id: "sams-club",
  name: "Sam's Club",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[SamsClub] Fetching purchase history offset ${offset}`);

      try {
        const res = await fetch(
          `${SAMS_API}?offset=${offset}&limit=20`,
          {
            headers: {
              Cookie: auth.authToken,
              "wm_consumer.id": auth.clientId ?? "",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const receipts = data?.payload?.receipts ?? data?.records ?? [];

        if (receipts.length === 0) break;

        for (const receipt of receipts) {
          const purchasedAt = new Date(receipt.purchaseDate ?? receipt.transactionDate);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeSamsReceipt(receipt));
        }

        offset += 20;
        if (receipts.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[SamsClub] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeSamsReceipt(receipt: any): RetailerOrder {
  const items: RetailerOrderItem[] = (receipt.items ?? receipt.lineItems ?? []).map((item: any) => ({
    name: item.description ?? item.itemName,
    sku: item.itemNumber ?? item.upc,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice ?? item.price ?? 0,
    totalPrice: item.totalPrice ?? (item.price ?? 0) * (item.quantity || 1),
    category: "Wholesale",
    imageUrl: item.imageUrl,
  }));

  const total = receipt.total ?? receipt.grandTotal ?? 0;
  const tax = receipt.tax ?? receipt.taxAmount ?? 0;

  return {
    orderId: `samsclub-${receipt.receiptId ?? receipt.transactionId}`,
    retailer: "sams-club",
    merchantName: receipt.clubName || "Sam's Club",
    merchantLocation: receipt.clubNumber ? `Club #${receipt.clubNumber}` : undefined,
    purchasedAt: new Date(receipt.purchaseDate ?? receipt.transactionDate),
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
