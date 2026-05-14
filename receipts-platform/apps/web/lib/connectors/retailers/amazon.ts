import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const AMAZON_ORDER_HISTORY_URL = "https://www.amazon.com/gp/your-account/order-history/ref=ppx_yo_dt_b_search";
const AMAZON_ORDER_API = "https://www.amazon.com/gp/your-account/order-details/ref=ppx_yo_dt_b_order_details";

// Amazon uses a combination of session cookies + CSRF tokens
// Auth token here is the session cookie string (ubid-main + session-id + at-main)

export const amazonConnector: RetailerConnector = {
  id: "amazon",
  name: "Amazon",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    const now = new Date();
    const startYear = since.getFullYear();
    const endYear = now.getFullYear();

    // Amazon organizes orders by year
    for (let year = startYear; year <= endYear; year++) {
      let startIndex = 0;
      let hasMore = true;

      while (hasMore) {
        console.log(`[Amazon] Fetching orders for ${year}, offset ${startIndex}`);

        try {
          const res = await fetch(
            `https://www.amazon.com/your-orders/orders?timeFilter=year-${year}&startIndex=${startIndex}&ref_=ppx_yo2ov_dt_b_pagination_1_2_pg_next`,
            {
              headers: {
                Cookie: auth.authToken,
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
                Accept: "text/html,application/xhtml+xml",
                "x-csrf-token": auth.metadata?.csrfToken ?? "",
              },
            }
          );

          if (!res.ok) {
            console.error(`[Amazon] HTTP ${res.status} for year ${year}`);
            break;
          }

          const html = await res.text();
          const orders = parseAmazonOrdersPage(html, year);

          if (orders.length === 0) {
            hasMore = false;
          } else {
            // Filter orders after 'since'
            for (const order of orders) {
              if (order.purchasedAt >= since) {
                allOrders.push(order);
              }
            }
            startIndex += 10;
            // Amazon shows max 10 orders per page
            if (orders.length < 10) hasMore = false;
          }
        } catch (err) {
          console.error(`[Amazon] Error fetching year ${year}:`, err);
          hasMore = false;
        }
      }
    }

    return allOrders;
  },
};

function parseAmazonOrdersPage(html: string, year: number): RetailerOrder[] {
  const orders: RetailerOrder[] = [];

  // Parse order blocks from HTML using regex patterns
  // Amazon order page has structured data we can extract
  const orderBlocks = html.split(/class="order-card"/).slice(1);

  for (const block of orderBlocks) {
    try {
      // Extract order ID
      const orderIdMatch = block.match(/order-id[^>]*>([^<]+)/i) ??
        block.match(/(\d{3}-\d{7}-\d{7})/);
      const orderId = orderIdMatch?.[1]?.trim() ?? `amazon-${year}-${Date.now()}`;

      // Extract date
      const dateMatch = block.match(/order-date[^>]*>([^<]+)/i) ??
        block.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i);
      const dateStr = dateMatch?.[1]?.trim() ?? dateMatch?.[0]?.trim();
      const purchasedAt = dateStr ? new Date(dateStr) : new Date(year, 0, 1);

      // Extract total
      const totalMatch = block.match(/grand-total[^>]*>\$?([\d,.]+)/i) ??
        block.match(/\$\s*([\d,.]+)/);
      const total = parseFloat(totalMatch?.[1]?.replace(/,/g, "") ?? "0");

      // Extract items
      const items: RetailerOrderItem[] = [];
      const itemMatches = block.matchAll(/item-title[^>]*>([^<]+)/gi);
      for (const match of itemMatches) {
        items.push({
          name: match[1].trim(),
          quantity: 1,
          unitPrice: 0, // Will be filled from detail page
          totalPrice: 0,
          category: "Shopping",
        });
      }

      if (total > 0 || items.length > 0) {
        orders.push({
          orderId: `amazon-${orderId}`,
          retailer: "amazon",
          merchantName: "Amazon",
          purchasedAt,
          items,
          subtotal: total * 0.92, // Approximate pre-tax
          tax: total * 0.08,
          total,
          currency: "USD",
          paymentMethod: "card",
          rawData: { year, orderId },
        });
      }
    } catch (err) {
      console.error("[Amazon] Error parsing order block:", err);
    }
  }

  return orders;
}
