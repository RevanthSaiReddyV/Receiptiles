import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

// Whole Foods uses Amazon's infrastructure (same auth as Amazon after acquisition)
const WF_API = "https://www.amazon.com/gp/your-account/order-history?orderFilter=wholefoods";

export const wholeFoodsConnector: RetailerConnector = {
  id: "whole-foods",
  name: "Whole Foods Market",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let startIndex = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[WholeFoods] Fetching orders offset ${startIndex}`);

      try {
        const res = await fetch(
          `https://www.amazon.com/your-orders/orders?orderFilter=wholefoods&startIndex=${startIndex}`,
          {
            headers: {
              Cookie: auth.authToken,
              "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
              Accept: "text/html,application/xhtml+xml",
            },
          }
        );

        if (!res.ok) break;

        const html = await res.text();
        const orders = parseWholeFoodsOrders(html);

        if (orders.length === 0) break;

        for (const order of orders) {
          if (order.purchasedAt >= since) {
            allOrders.push(order);
          } else {
            hasMore = false;
            break;
          }
        }

        startIndex += 10;
        if (orders.length < 10) hasMore = false;
      } catch (err) {
        console.error(`[WholeFoods] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function parseWholeFoodsOrders(html: string): RetailerOrder[] {
  const orders: RetailerOrder[] = [];
  const orderBlocks = html.split(/class="order-card"/).slice(1);

  for (const block of orderBlocks) {
    try {
      const orderIdMatch = block.match(/(\d{3}-\d{7}-\d{7})/);
      const orderId = orderIdMatch?.[1] ?? `wf-${Date.now()}`;

      const dateMatch = block.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i);
      const purchasedAt = dateMatch ? new Date(dateMatch[0]) : new Date();

      const totalMatch = block.match(/\$\s*([\d,.]+)/);
      const total = parseFloat(totalMatch?.[1]?.replace(/,/g, "") ?? "0");

      const items: RetailerOrderItem[] = [];
      const itemMatches = block.matchAll(/item-title[^>]*>([^<]+)/gi);
      for (const match of itemMatches) {
        items.push({
          name: match[1].trim(),
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          category: "Groceries",
        });
      }

      if (total > 0) {
        orders.push({
          orderId: `wholefoods-${orderId}`,
          retailer: "whole-foods",
          merchantName: "Whole Foods Market",
          purchasedAt,
          items,
          subtotal: total * 0.92,
          tax: total * 0.08,
          total,
          currency: "USD",
          paymentMethod: "card",
          rawData: { orderId },
        });
      }
    } catch (err) {
      // Skip malformed blocks
    }
  }

  return orders;
}
