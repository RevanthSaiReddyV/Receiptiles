import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const CHIPOTLE_API = "https://services.chipotle.com/order/v2/history";

export const chipotleConnector: RetailerConnector = {
  id: "chipotle",
  name: "Chipotle",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Chipotle] Fetching order history page ${page}`);

      try {
        const res = await fetch(
          `${CHIPOTLE_API}?page=${page}&size=20`,
          {
            headers: {
              Authorization: `Bearer ${auth.authToken}`,
              "Ocp-Apim-Subscription-Key": auth.clientId ?? "",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const orders = data?.orders ?? data?.content ?? [];

        if (orders.length === 0) break;

        for (const order of orders) {
          const purchasedAt = new Date(order.timestamp ?? order.orderDate);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeChipotleOrder(order));
        }

        page++;
        if (orders.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[Chipotle] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeChipotleOrder(order: any): RetailerOrder {
  const items: RetailerOrderItem[] = (order.items ?? order.orderItems ?? []).map((item: any) => ({
    name: item.menuItemName ?? item.name,
    quantity: item.quantity || 1,
    unitPrice: item.price ?? item.unitPrice ?? 0,
    totalPrice: (item.price ?? item.unitPrice ?? 0) * (item.quantity || 1),
    category: "Food & Drink",
  }));

  const total = order.total ?? order.orderTotal ?? 0;
  const tax = order.tax ?? order.taxAmount ?? 0;

  return {
    orderId: `chipotle-${order.orderId ?? order.orderNumber}`,
    retailer: "chipotle",
    merchantName: order.restaurantName ? `Chipotle - ${order.restaurantName}` : "Chipotle",
    merchantLocation: order.restaurantId,
    purchasedAt: new Date(order.timestamp ?? order.orderDate),
    items,
    subtotal: total - tax,
    tax,
    total,
    currency: "USD",
    paymentMethod: order.payment?.type?.toLowerCase() ?? "card",
    cardLast4: order.payment?.lastFour,
    rawData: order,
  };
}
