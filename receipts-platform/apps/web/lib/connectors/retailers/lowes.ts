import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const LOWES_API = "https://www.lowes.com/api/ordering/order-history";

export const lowesConnector: RetailerConnector = {
  id: "lowes",
  name: "Lowe's",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Lowes] Fetching orders page ${page}`);

      try {
        const res = await fetch(
          `${LOWES_API}?page=${page}&pageSize=20&startDate=${since.toISOString().split("T")[0]}`,
          {
            headers: {
              Cookie: auth.authToken,
              Accept: "application/json",
              "x-requested-with": "XMLHttpRequest",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const orders = data?.orders ?? [];

        if (orders.length === 0) break;

        for (const order of orders) {
          allOrders.push(normalizeLowesOrder(order));
        }

        page++;
        if (orders.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[Lowes] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeLowesOrder(order: any): RetailerOrder {
  const items: RetailerOrderItem[] = (order.items ?? order.lineItems ?? []).map((item: any) => ({
    name: item.description ?? item.productName,
    sku: item.itemNumber ?? item.modelNumber,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice ?? item.price ?? 0,
    totalPrice: item.extendedPrice ?? (item.price ?? 0) * (item.quantity || 1),
    category: "Home Improvement",
    imageUrl: item.imageUrl,
  }));

  const total = order.orderTotal ?? order.total ?? 0;
  const tax = order.taxTotal ?? order.tax ?? 0;

  return {
    orderId: `lowes-${order.orderNumber ?? order.orderId}`,
    retailer: "lowes",
    merchantName: order.storeName || "Lowe's",
    merchantLocation: order.storeNumber ? `Store #${order.storeNumber}` : undefined,
    purchasedAt: new Date(order.orderDate ?? order.placedDate),
    items,
    subtotal: total - tax,
    tax,
    total,
    currency: "USD",
    paymentMethod: order.payment?.method?.toLowerCase() ?? "card",
    cardLast4: order.payment?.lastFour,
    rawData: order,
  };
}
