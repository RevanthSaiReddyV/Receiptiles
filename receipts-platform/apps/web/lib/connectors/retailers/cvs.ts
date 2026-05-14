import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const CVS_API = "https://www.cvs.com/retail-api/purchase-history/v1/receipts";

export const cvsConnector: RetailerConnector = {
  id: "cvs",
  name: "CVS Pharmacy",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[CVS] Fetching receipts page ${page}`);

      try {
        const res = await fetch(
          `${CVS_API}?page=${page}&size=20&startDate=${since.toISOString().split("T")[0]}`,
          {
            headers: {
              Cookie: auth.authToken,
              "x-api-key": auth.clientId ?? "",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const receipts = data?.receipts ?? data?.data ?? [];

        if (receipts.length === 0) break;

        for (const receipt of receipts) {
          allOrders.push(normalizeCVSReceipt(receipt));
        }

        page++;
        if (receipts.length < 20) hasMore = false;
      } catch (err) {
        console.error(`[CVS] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeCVSReceipt(receipt: any): RetailerOrder {
  const items: RetailerOrderItem[] = (receipt.items ?? receipt.lineItems ?? []).map((item: any) => ({
    name: item.description ?? item.name,
    sku: item.sku ?? item.upc,
    quantity: item.quantity || 1,
    unitPrice: item.price ?? item.unitPrice ?? 0,
    totalPrice: item.extendedPrice ?? (item.price ?? 0) * (item.quantity || 1),
    category: mapCVSCategory(item.department ?? item.category),
  }));

  const total = receipt.total ?? receipt.grandTotal ?? 0;
  const tax = receipt.taxTotal ?? receipt.tax ?? 0;

  return {
    orderId: `cvs-${receipt.receiptId ?? receipt.transactionId}`,
    retailer: "cvs",
    merchantName: receipt.storeName || "CVS Pharmacy",
    merchantLocation: receipt.storeNumber ? `Store #${receipt.storeNumber}` : undefined,
    purchasedAt: new Date(receipt.transactionDate ?? receipt.date),
    items,
    subtotal: total - tax,
    tax,
    total,
    currency: "USD",
    paymentMethod: receipt.tender?.type?.toLowerCase() ?? "card",
    cardLast4: receipt.tender?.lastFour,
    rawData: receipt,
  };
}

function mapCVSCategory(dept?: string): string {
  if (!dept) return "Health";
  const lower = dept.toLowerCase();
  if (lower.includes("rx") || lower.includes("pharm")) return "Health";
  if (lower.includes("beauty") || lower.includes("cosmetic")) return "Personal Care";
  if (lower.includes("food") || lower.includes("snack") || lower.includes("beverage")) return "Groceries";
  if (lower.includes("photo")) return "Services";
  return "Health";
}
