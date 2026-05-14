import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const TARGET_API_BASE = "https://api.target.com/guest_order_aggregations/v1";

export const targetConnector: RetailerConnector = {
  id: "target",
  name: "Target",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let offset = 0;
    const limit = 20;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Target] Fetching orders offset ${offset}`);

      try {
        const res = await fetch(
          `${TARGET_API_BASE}/orders?offset=${offset}&limit=${limit}&sort_by=placed_at&sort_order=desc`,
          {
            headers: {
              Authorization: `Bearer ${auth.authToken}`,
              "x-api-key": auth.clientId ?? "ff457966e64d5e877fdbad070f276d18ecec401e",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          console.error(`[Target] HTTP ${res.status}`);
          break;
        }

        const data = await res.json();
        const orders = data?.orders ?? data?.order_aggregations ?? [];

        if (orders.length === 0) {
          hasMore = false;
          continue;
        }

        for (const order of orders) {
          const purchasedAt = new Date(order.placed_at ?? order.order_date);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeTargetOrder(order));
        }

        offset += limit;
        if (orders.length < limit) hasMore = false;
      } catch (err) {
        console.error(`[Target] Error at offset ${offset}:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

interface TargetOrder {
  order_id: string;
  placed_at: string;
  order_date?: string;
  order_total: number;
  order_subtotal: number;
  tax_total: number;
  store_name?: string;
  store_id?: string;
  channel?: string; // "STORE" | "ONLINE"
  order_lines: Array<{
    tcin: string;
    description: string;
    quantity: number;
    unit_price: number;
    extended_amount: number;
    image_url?: string;
    department_name?: string;
  }>;
  payment_methods: Array<{
    type: string;
    last_four: string;
    card_brand?: string;
  }>;
}

function normalizeTargetOrder(order: TargetOrder): RetailerOrder {
  const items: RetailerOrderItem[] = (order.order_lines ?? []).map((line) => ({
    name: line.description,
    sku: line.tcin,
    quantity: line.quantity || 1,
    unitPrice: line.unit_price ?? 0,
    totalPrice: line.extended_amount ?? line.unit_price * (line.quantity || 1),
    category: mapTargetDepartment(line.department_name),
    imageUrl: line.image_url,
  }));

  const payment = order.payment_methods?.[0];

  return {
    orderId: `target-${order.order_id}`,
    retailer: "target",
    merchantName: order.store_name || "Target",
    merchantLocation: order.store_id ? `Store #${order.store_id}` : undefined,
    purchasedAt: new Date(order.placed_at ?? order.order_date ?? ""),
    items,
    subtotal: order.order_subtotal ?? order.order_total - order.tax_total,
    tax: order.tax_total ?? 0,
    total: order.order_total,
    currency: "USD",
    paymentMethod: payment?.card_brand?.toLowerCase() ?? payment?.type ?? "card",
    cardLast4: payment?.last_four,
    rawData: order,
  };
}

function mapTargetDepartment(dept?: string): string {
  if (!dept) return "Shopping";
  const lower = dept.toLowerCase();
  if (lower.includes("grocery") || lower.includes("food")) return "Groceries";
  if (lower.includes("beauty") || lower.includes("health")) return "Health";
  if (lower.includes("electronic")) return "Electronics";
  if (lower.includes("apparel") || lower.includes("clothing")) return "Clothing";
  if (lower.includes("home") || lower.includes("decor")) return "Home";
  if (lower.includes("toy") || lower.includes("game")) return "Entertainment";
  return "Shopping";
}
