import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

// Kroger uses OAuth2 with their public API
const KROGER_API_BASE = "https://api.kroger.com/v1";

export const krogerConnector: RetailerConnector = {
  id: "kroger",
  name: "Kroger",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Kroger] Fetching receipts page ${page}`);

      try {
        const res = await fetch(
          `${KROGER_API_BASE}/receipts?filter.start=${since.toISOString()}&page=${page}&limit=25`,
          {
            headers: {
              Authorization: `Bearer ${auth.authToken}`,
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          console.error(`[Kroger] HTTP ${res.status}`);
          break;
        }

        const data = await res.json();
        const receipts = data?.data ?? [];

        if (receipts.length === 0) {
          hasMore = false;
          continue;
        }

        for (const receipt of receipts) {
          allOrders.push(normalizeKrogerReceipt(receipt));
        }

        page++;
        if (receipts.length < 25) hasMore = false;
      } catch (err) {
        console.error(`[Kroger] Error on page ${page}:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

interface KrogerReceipt {
  receiptId: string;
  transactionTime: string;
  total: { amount: number };
  subTotal: { amount: number };
  taxTotal: { amount: number };
  storeId: string;
  storeName?: string;
  divisionName?: string; // "Kroger", "Ralphs", "Fred Meyer", etc.
  items: Array<{
    upc: string;
    description: string;
    quantity: number;
    price: { regular: number; promo?: number };
    totalPrice: number;
    department?: string;
    weight?: number;
    weightUnit?: string;
  }>;
  tenders: Array<{
    type: string;
    amount: number;
    lastFour?: string;
  }>;
  loyaltyId?: string;
  fuelPoints?: number;
  totalSavings?: number;
}

function normalizeKrogerReceipt(receipt: KrogerReceipt): RetailerOrder {
  const items: RetailerOrderItem[] = (receipt.items ?? []).map((item) => ({
    name: item.description,
    sku: item.upc,
    quantity: item.quantity || 1,
    unitPrice: item.price?.promo ?? item.price?.regular ?? 0,
    totalPrice: item.totalPrice ?? (item.price?.promo ?? item.price?.regular ?? 0) * (item.quantity || 1),
    category: mapKrogerDepartment(item.department),
  }));

  const tender = receipt.tenders?.[0];
  const storeBrand = receipt.divisionName || "Kroger";

  return {
    orderId: `kroger-${receipt.receiptId}`,
    retailer: "kroger",
    merchantName: `${storeBrand}${receipt.storeName ? ` - ${receipt.storeName}` : ""}`,
    merchantLocation: receipt.storeId ? `Store #${receipt.storeId}` : undefined,
    purchasedAt: new Date(receipt.transactionTime),
    items,
    subtotal: receipt.subTotal?.amount ?? 0,
    tax: receipt.taxTotal?.amount ?? 0,
    total: receipt.total?.amount ?? 0,
    currency: "USD",
    paymentMethod: tender?.type?.toLowerCase() ?? "card",
    cardLast4: tender?.lastFour,
    rawData: receipt,
  };
}

function mapKrogerDepartment(dept?: string): string {
  if (!dept) return "Groceries";
  const lower = dept.toLowerCase();
  if (lower.includes("produce") || lower.includes("dairy") || lower.includes("meat") || lower.includes("bakery") || lower.includes("deli")) return "Groceries";
  if (lower.includes("pharm") || lower.includes("health")) return "Health";
  if (lower.includes("fuel") || lower.includes("gas")) return "Gas";
  if (lower.includes("floral")) return "Shopping";
  return "Groceries";
}
