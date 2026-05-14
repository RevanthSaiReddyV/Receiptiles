import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const BESTBUY_API = "https://www.bestbuy.com/profile/ss/orders";

export const bestBuyConnector: RetailerConnector = {
  id: "best-buy",
  name: "Best Buy",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[BestBuy] Fetching orders page ${page}`);

      try {
        const res = await fetch(
          `${BESTBUY_API}?page=${page}&pageSize=20&period=custom&startDate=${since.toISOString().split("T")[0]}`,
          {
            headers: {
              Cookie: auth.authToken,
              Accept: "application/json",
              "x-client-id": "browse",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const orders = data?.orders ?? [];

        if (orders.length === 0) break;

        for (const order of orders) {
          allOrders.push(normalizeBestBuyOrder(order));
        }

        page++;
        if (orders.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[BestBuy] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeBestBuyOrder(order: any): RetailerOrder {
  const items: RetailerOrderItem[] = (order.lineItems ?? order.items ?? []).map((item: any) => ({
    name: item.productName ?? item.description,
    sku: item.skuId ?? item.sku,
    quantity: item.quantity || 1,
    unitPrice: item.itemPrice ?? item.unitPrice ?? 0,
    totalPrice: item.totalPrice ?? (item.itemPrice ?? 0) * (item.quantity || 1),
    category: "Electronics",
    imageUrl: item.imageUrl,
  }));

  const total = order.orderTotal ?? order.total ?? 0;
  const tax = order.taxTotal ?? order.tax ?? 0;

  return {
    orderId: `bestbuy-${order.orderId ?? order.orderNumber}`,
    retailer: "best-buy",
    merchantName: "Best Buy",
    merchantLocation: order.storeId ? `Store #${order.storeId}` : undefined,
    purchasedAt: new Date(order.orderDate ?? order.createdDate),
    items,
    subtotal: total - tax,
    tax,
    total,
    currency: "USD",
    paymentMethod: order.payment?.cardType?.toLowerCase() ?? "card",
    cardLast4: order.payment?.lastFour,
    rawData: order,
  };
}
