import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const HD_API_BASE = "https://www.homedepot.com/mcc-order/v3/orders";

export const homeDepotConnector: RetailerConnector = {
  id: "home-depot",
  name: "Home Depot",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[HomeDepot] Fetching orders page ${page}`);

      try {
        const res = await fetch(
          `${HD_API_BASE}?pageSize=20&pageIndex=${page}&orderDateFrom=${since.toISOString().split("T")[0]}`,
          {
            headers: {
              Cookie: auth.authToken,
              "x-experience-name": "hd-home",
              "x-hd-dc": "origin",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          console.error(`[HomeDepot] HTTP ${res.status}`);
          break;
        }

        const data = await res.json();
        const orders = data?.orders ?? [];

        if (orders.length === 0) {
          hasMore = false;
          continue;
        }

        for (const order of orders) {
          allOrders.push(normalizeHDOrder(order));
        }

        page++;
        if (orders.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[HomeDepot] Error on page ${page}:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

interface HDOrder {
  orderNumber: string;
  orderDate: string;
  orderTotal: number;
  subTotal: number;
  taxTotal: number;
  shippingTotal?: number;
  storeName?: string;
  storeNumber?: string;
  fulfillmentType?: string; // "BOPIS" | "SHIP" | "STORE"
  lineItems: Array<{
    itemId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    imageUrl?: string;
    department?: string;
    aisle?: string;
    bay?: string;
  }>;
  payments: Array<{
    paymentType: string;
    lastFour?: string;
    amount: number;
  }>;
}

function normalizeHDOrder(order: HDOrder): RetailerOrder {
  const items: RetailerOrderItem[] = (order.lineItems ?? []).map((line) => ({
    name: line.description,
    sku: line.itemId,
    quantity: line.quantity || 1,
    unitPrice: line.unitPrice ?? 0,
    totalPrice: line.totalPrice ?? 0,
    category: "Home Improvement",
    imageUrl: line.imageUrl,
  }));

  const payment = order.payments?.[0];

  return {
    orderId: `homedepot-${order.orderNumber}`,
    retailer: "home-depot",
    merchantName: order.storeName || "Home Depot",
    merchantLocation: order.storeNumber ? `Store #${order.storeNumber}` : undefined,
    purchasedAt: new Date(order.orderDate),
    items,
    subtotal: order.subTotal ?? 0,
    tax: order.taxTotal ?? 0,
    total: order.orderTotal ?? 0,
    currency: "USD",
    paymentMethod: payment?.paymentType?.toLowerCase() ?? "card",
    cardLast4: payment?.lastFour,
    rawData: order,
  };
}
