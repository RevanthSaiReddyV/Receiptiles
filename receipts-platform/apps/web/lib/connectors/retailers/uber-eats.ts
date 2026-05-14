import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const UBER_EATS_API = "https://www.ubereats.com/api/getOrdersV1";

export const uberEatsConnector: RetailerConnector = {
  id: "uber-eats",
  name: "Uber Eats",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      console.log(`[UberEats] Fetching orders${cursor ? ` cursor: ${cursor.slice(0, 8)}...` : ""}`);

      try {
        const body: any = { limit: 20 };
        if (cursor) body.cursor = cursor;

        const res = await fetch(UBER_EATS_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: auth.authToken,
            "x-csrf-token": auth.metadata?.csrfToken ?? "",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) break;

        const data = await res.json();
        const orders = data?.data?.orders ?? data?.orders ?? [];
        cursor = data?.data?.meta?.nextCursor ?? data?.meta?.nextCursor;

        if (orders.length === 0) break;

        for (const order of orders) {
          const purchasedAt = new Date(order.completedAt ?? order.createdAt);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeUberEatsOrder(order));
        }

        if (!cursor) hasMore = false;
      } catch (err) {
        console.error(`[UberEats] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeUberEatsOrder(order: any): RetailerOrder {
  const items: RetailerOrderItem[] = (order.items ?? order.orderItems ?? []).map((item: any) => ({
    name: item.title ?? item.name,
    quantity: item.quantity || 1,
    unitPrice: (item.price ?? item.basePrice ?? 0) / 100,
    totalPrice: ((item.price ?? item.basePrice ?? 0) * (item.quantity || 1)) / 100,
    category: "Food & Drink",
    imageUrl: item.imageUrl,
  }));

  const total = (order.fareInfo?.totalPrice ?? order.total ?? 0) / 100;
  const subtotal = (order.fareInfo?.subTotal ?? order.subtotal ?? 0) / 100;
  const tax = (order.fareInfo?.tax ?? order.tax ?? 0) / 100;

  return {
    orderId: `ubereats-${order.uuid ?? order.orderUuid}`,
    retailer: "uber-eats",
    merchantName: order.store?.name ?? order.restaurantName ?? "Uber Eats",
    purchasedAt: new Date(order.completedAt ?? order.createdAt),
    items,
    subtotal,
    tax,
    total,
    currency: "USD",
    paymentMethod: order.paymentProfile?.cardType?.toLowerCase() ?? "card",
    cardLast4: order.paymentProfile?.lastFour,
    rawData: order,
  };
}
