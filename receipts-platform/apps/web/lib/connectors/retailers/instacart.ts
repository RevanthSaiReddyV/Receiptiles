import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const INSTACART_API = "https://www.instacart.com/v3/orders";

export const instacartConnector: RetailerConnector = {
  id: "instacart",
  name: "Instacart",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let offset = 0;
    const limit = 20;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Instacart] Fetching orders offset ${offset}`);

      try {
        const res = await fetch(
          `${INSTACART_API}?offset=${offset}&limit=${limit}`,
          {
            headers: {
              Cookie: auth.authToken,
              "X-Client-Identifier": "web",
              Accept: "application/json",
              "x-csrf-token": auth.metadata?.csrfToken ?? "",
            },
          }
        );

        if (!res.ok) {
          console.error(`[Instacart] HTTP ${res.status}`);
          break;
        }

        const data = await res.json();
        const orders = data?.orders ?? [];

        if (orders.length === 0) {
          hasMore = false;
          continue;
        }

        for (const order of orders) {
          const purchasedAt = new Date(order.created_at ?? order.delivered_at);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeInstacartOrder(order));
        }

        offset += limit;
        if (orders.length < limit) hasMore = false;
      } catch (err) {
        console.error(`[Instacart] Error at offset ${offset}:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

interface InstacartOrder {
  id: string;
  order_id: string;
  created_at: string;
  delivered_at?: string;
  retailer_name: string;
  retailer_slug: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  tip: number;
  service_fee: number;
  delivery_fee: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    replacement_item?: string;
    image_url?: string;
    aisle?: string;
    weight?: number;
    unit?: string;
  }>;
  payment: {
    card_type?: string;
    last_four?: string;
  };
}

function normalizeInstacartOrder(order: InstacartOrder): RetailerOrder {
  const items: RetailerOrderItem[] = (order.items ?? []).map((item) => ({
    name: item.name,
    sku: item.id,
    quantity: item.quantity || 1,
    unitPrice: item.unit_price ?? 0,
    totalPrice: item.total_price ?? 0,
    category: "Groceries",
    imageUrl: item.image_url,
  }));

  return {
    orderId: `instacart-${order.order_id ?? order.id}`,
    retailer: "instacart",
    merchantName: order.retailer_name || "Instacart",
    purchasedAt: new Date(order.delivered_at ?? order.created_at),
    items,
    subtotal: order.subtotal ?? 0,
    tax: order.tax ?? 0,
    total: order.total ?? 0,
    currency: "USD",
    paymentMethod: order.payment?.card_type?.toLowerCase() ?? "card",
    cardLast4: order.payment?.last_four,
    rawData: order,
  };
}
