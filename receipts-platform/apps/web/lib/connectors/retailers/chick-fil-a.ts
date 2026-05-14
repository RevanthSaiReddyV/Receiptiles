import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const CFA_API = "https://order.chick-fil-a.com/api/v1/orders/history";

export const chickFilAConnector: RetailerConnector = {
  id: "chick-fil-a",
  name: "Chick-fil-A",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[ChickFilA] Fetching order history page ${page}`);

      try {
        const res = await fetch(
          `${CFA_API}?page=${page}&pageSize=25`,
          {
            headers: {
              Authorization: `Bearer ${auth.authToken}`,
              "cfa-api-key": auth.clientId ?? "",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const orders = data?.orders ?? [];

        if (orders.length === 0) break;

        for (const order of orders) {
          const purchasedAt = new Date(order.orderDate ?? order.createdAt);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeCFAOrder(order));
        }

        page++;
        if (orders.length < 25) hasMore = false;
      } catch (err) {
        console.error(`[ChickFilA] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeCFAOrder(order: any): RetailerOrder {
  const items: RetailerOrderItem[] = (order.items ?? order.lineItems ?? []).map((item: any) => ({
    name: item.name ?? item.itemName,
    quantity: item.quantity || 1,
    unitPrice: item.price ?? item.unitPrice ?? 0,
    totalPrice: (item.price ?? 0) * (item.quantity || 1),
    category: "Food & Drink",
    imageUrl: item.imageUrl,
  }));

  const total = order.total ?? order.orderTotal ?? 0;
  const tax = order.tax ?? order.taxAmount ?? 0;

  return {
    orderId: `chickfila-${order.orderId ?? order.orderNumber}`,
    retailer: "chick-fil-a",
    merchantName: order.storeName ? `Chick-fil-A - ${order.storeName}` : "Chick-fil-A",
    merchantLocation: order.storeNumber,
    purchasedAt: new Date(order.orderDate ?? order.createdAt),
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
