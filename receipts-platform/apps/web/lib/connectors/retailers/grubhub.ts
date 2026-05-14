import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const GRUBHUB_API = "https://api-gtm.grubhub.com/diners/me/orders";

export const grubhubConnector: RetailerConnector = {
  id: "grubhub",
  name: "Grubhub",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Grubhub] Fetching orders page ${page}`);

      try {
        const res = await fetch(
          `${GRUBHUB_API}?page=${page}&pageSize=20`,
          {
            headers: {
              Authorization: `Bearer ${auth.authToken}`,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const orders = data?.orders ?? [];

        if (orders.length === 0) break;

        for (const order of orders) {
          const purchasedAt = new Date(order.placed_at ?? order.time_placed);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeGrubhubOrder(order));
        }

        page++;
        if (orders.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[Grubhub] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeGrubhubOrder(order: any): RetailerOrder {
  const items: RetailerOrderItem[] = (order.line_items ?? order.items ?? []).map((item: any) => ({
    name: item.name ?? item.menu_item_name,
    quantity: item.quantity || 1,
    unitPrice: (item.price ?? item.unit_price ?? 0) / 100,
    totalPrice: ((item.price ?? 0) * (item.quantity || 1)) / 100,
    category: "Food & Drink",
  }));

  const total = (order.charges?.total ?? order.total ?? 0) / 100;
  const tax = (order.charges?.tax ?? order.tax ?? 0) / 100;

  return {
    orderId: `grubhub-${order.order_id ?? order.id}`,
    retailer: "grubhub",
    merchantName: order.restaurant?.name ?? order.restaurant_name ?? "Grubhub",
    purchasedAt: new Date(order.placed_at ?? order.time_placed),
    items,
    subtotal: total - tax,
    tax,
    total,
    currency: "USD",
    paymentMethod: order.payment?.card_type?.toLowerCase() ?? "card",
    cardLast4: order.payment?.last_four,
    rawData: order,
  };
}
