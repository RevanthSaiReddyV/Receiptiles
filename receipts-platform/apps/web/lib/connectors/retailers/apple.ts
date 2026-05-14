import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const APPLE_API = "https://reportaproblem.apple.com/api/purchase-history";

export const appleConnector: RetailerConnector = {
  id: "apple",
  name: "Apple",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let batchNumber = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Apple] Fetching purchases batch ${batchNumber}`);

      try {
        const res = await fetch(
          `${APPLE_API}?batchNumber=${batchNumber}&batchSize=20&sort=DESCENDING`,
          {
            headers: {
              Cookie: auth.authToken,
              "X-Apple-Store-Front": "143441-1,32",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const purchases = data?.purchases ?? data?.items ?? [];

        if (purchases.length === 0) break;

        for (const purchase of purchases) {
          const purchasedAt = new Date(purchase.purchaseDate ?? purchase.date);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeApplePurchase(purchase));
        }

        batchNumber++;
        if (purchases.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[Apple] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeApplePurchase(purchase: any): RetailerOrder {
  const items: RetailerOrderItem[] = [{
    name: purchase.title ?? purchase.productName ?? "Apple Purchase",
    sku: purchase.adamId ?? purchase.productId,
    quantity: 1,
    unitPrice: purchase.price ?? purchase.amount ?? 0,
    totalPrice: purchase.price ?? purchase.amount ?? 0,
    category: mapAppleCategory(purchase.contentType ?? purchase.category),
    imageUrl: purchase.artworkUrl,
  }];

  const total = purchase.price ?? purchase.amount ?? 0;

  return {
    orderId: `apple-${purchase.invoiceId ?? purchase.purchaseId ?? purchase.adamId}`,
    retailer: "apple",
    merchantName: purchase.sellerName ?? "Apple",
    purchasedAt: new Date(purchase.purchaseDate ?? purchase.date),
    items,
    subtotal: total,
    tax: 0,
    total,
    currency: purchase.currency ?? "USD",
    paymentMethod: "apple-pay",
    rawData: purchase,
  };
}

function mapAppleCategory(type?: string): string {
  if (!type) return "Digital";
  const lower = type.toLowerCase();
  if (lower.includes("app")) return "Apps";
  if (lower.includes("music") || lower.includes("song")) return "Music";
  if (lower.includes("movie") || lower.includes("tv")) return "Entertainment";
  if (lower.includes("book")) return "Books";
  if (lower.includes("subscription")) return "Subscriptions";
  if (lower.includes("icloud") || lower.includes("storage")) return "Cloud Services";
  return "Digital";
}
