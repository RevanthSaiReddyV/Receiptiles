import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const STARBUCKS_API = "https://www.starbucks.com/bff/ordering/history";

export const starbucksConnector: RetailerConnector = {
  id: "starbucks",
  name: "Starbucks",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Starbucks] Fetching order history page ${page}`);

      try {
        const res = await fetch(
          `${STARBUCKS_API}?page=${page}&pageSize=25`,
          {
            headers: {
              Authorization: `Bearer ${auth.authToken}`,
              Accept: "application/json",
              "x-requested-with": "XMLHttpRequest",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const orders = data?.orderHistory ?? data?.orders ?? [];

        if (orders.length === 0) break;

        for (const order of orders) {
          const purchasedAt = new Date(order.orderDate ?? order.completedDate);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeStarbucksOrder(order));
        }

        page++;
        if (orders.length < 25) hasMore = false;
      } catch (err) {
        console.error(`[Starbucks] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeStarbucksOrder(order: any): RetailerOrder {
  const items: RetailerOrderItem[] = (order.items ?? order.basket?.items ?? []).map((item: any) => ({
    name: item.name ?? item.productName,
    quantity: item.quantity || 1,
    unitPrice: item.price ?? item.unitPrice ?? 0,
    totalPrice: (item.price ?? item.unitPrice ?? 0) * (item.quantity || 1),
    category: "Coffee",
    imageUrl: item.imageUrl,
  }));

  const total = order.totalAmount ?? order.total ?? 0;
  const tax = order.taxAmount ?? order.tax ?? 0;

  return {
    orderId: `starbucks-${order.orderId ?? order.orderNumber}`,
    retailer: "starbucks",
    merchantName: order.storeName ? `Starbucks - ${order.storeName}` : "Starbucks",
    merchantLocation: order.storeNumber ? `Store #${order.storeNumber}` : undefined,
    purchasedAt: new Date(order.orderDate ?? order.completedDate),
    items,
    subtotal: total - tax,
    tax,
    total,
    currency: "USD",
    paymentMethod: order.paymentMethod ?? "starbucks-card",
    cardLast4: order.cardLastFour,
    rawData: order,
  };
}
