import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const WALMART_API_BASE = "https://www.walmart.com/orchestra/home/graphql";

const ORDERS_QUERY = `
query GetPurchaseHistory($page: Int!, $startDate: String, $endDate: String) {
  purchaseHistory(input: { page: $page, startDate: $startDate, endDate: $endDate }) {
    orders {
      orderId
      orderDate
      orderTotal {
        amount
        currency
      }
      orderStatus
      storeId
      storeName
      orderLines {
        lineNumber
        itemId
        name
        quantity
        unitPrice {
          amount
        }
        totalPrice {
          amount
        }
        imageUrl
        categoryPath
      }
      paymentMethods {
        cardType
        lastFour
      }
      taxAmount {
        amount
      }
    }
    totalPages
    currentPage
  }
}
`;

export const walmartConnector: RetailerConnector = {
  id: "walmart",
  name: "Walmart",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let totalPages = 1;

    const startDate = since.toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    while (page <= totalPages) {
      console.log(`[Walmart] Fetching page ${page}/${totalPages}`);

      try {
        const res = await fetch(WALMART_API_BASE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: auth.authToken,
            "WM_SEC.AUTH_TOKEN": auth.metadata?.walmartToken ?? "",
            "x-o-correlation-id": crypto.randomUUID(),
            "x-o-gql-query": "query GetPurchaseHistory",
          },
          body: JSON.stringify({
            query: ORDERS_QUERY,
            variables: { page, startDate, endDate },
          }),
        });

        if (!res.ok) {
          console.error(`[Walmart] HTTP ${res.status}`);
          break;
        }

        const data = await res.json();
        const history = data?.data?.purchaseHistory;

        if (!history?.orders?.length) break;

        totalPages = history.totalPages ?? 1;

        for (const order of history.orders) {
          const normalized = normalizeWalmartOrder(order);
          if (normalized.purchasedAt >= since) {
            allOrders.push(normalized);
          }
        }

        page++;
      } catch (err) {
        console.error(`[Walmart] Error on page ${page}:`, err);
        break;
      }
    }

    return allOrders;
  },
};

interface WalmartOrder {
  orderId: string;
  orderDate: string;
  orderTotal: { amount: number; currency: string };
  orderStatus: string;
  storeId?: string;
  storeName?: string;
  orderLines: Array<{
    lineNumber: number;
    itemId: string;
    name: string;
    quantity: number;
    unitPrice: { amount: number };
    totalPrice: { amount: number };
    imageUrl?: string;
    categoryPath?: string;
  }>;
  paymentMethods: Array<{ cardType: string; lastFour: string }>;
  taxAmount?: { amount: number };
}

function normalizeWalmartOrder(order: WalmartOrder): RetailerOrder {
  const items: RetailerOrderItem[] = (order.orderLines ?? []).map((line) => ({
    name: line.name,
    sku: line.itemId,
    quantity: line.quantity || 1,
    unitPrice: line.unitPrice?.amount ?? 0,
    totalPrice: line.totalPrice?.amount ?? 0,
    category: mapWalmartCategory(line.categoryPath),
    imageUrl: line.imageUrl,
  }));

  const payment = order.paymentMethods?.[0];
  const tax = order.taxAmount?.amount ?? 0;

  return {
    orderId: `walmart-${order.orderId}`,
    retailer: "walmart",
    merchantName: order.storeName || "Walmart",
    merchantLocation: order.storeId ? `Store #${order.storeId}` : undefined,
    purchasedAt: new Date(order.orderDate),
    items,
    subtotal: order.orderTotal.amount - tax,
    tax,
    total: order.orderTotal.amount,
    currency: order.orderTotal.currency || "USD",
    paymentMethod: payment?.cardType?.toLowerCase() ?? "card",
    cardLast4: payment?.lastFour,
    rawData: order,
  };
}

function mapWalmartCategory(categoryPath?: string): string {
  if (!categoryPath) return "Shopping";
  const lower = categoryPath.toLowerCase();
  if (lower.includes("food") || lower.includes("grocer")) return "Groceries";
  if (lower.includes("electronic")) return "Electronics";
  if (lower.includes("health") || lower.includes("pharm")) return "Health";
  if (lower.includes("clothing") || lower.includes("apparel")) return "Clothing";
  if (lower.includes("home")) return "Home";
  if (lower.includes("toy")) return "Entertainment";
  return "Shopping";
}
