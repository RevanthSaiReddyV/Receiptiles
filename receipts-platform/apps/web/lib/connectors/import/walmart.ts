import type { ImportConnector, ImportedOrder, ImportedOrderItem } from "./types";

export const walmartImportConnector: ImportConnector = {
  id: "walmart",
  name: "Walmart",
  description: "Import order history from your Walmart purchase history (CSV export)",
  icon: "walmart",
  supportedFormats: ["csv"],
  instructions:
    "Go to walmart.com/account/wmpurchasehistory → click 'Download purchase history' to get your CSV. For in-store purchases, open the Walmart app → Account → Purchase History → use the share/export option.",

  async parseFile(content: string, fileName: string) {
    const rows = parseCSV(content);
    if (rows.length === 0) return [];

    const headers = rows[0].map((h) => h.trim().toLowerCase());

    const orderIdIdx = findCol(headers, ["order number", "order id", "order_number"]);
    const titleIdx = findCol(headers, ["item", "product", "item description", "product name"]);
    const qtyIdx = findCol(headers, ["quantity", "qty"]);
    const priceIdx = findCol(headers, ["price", "unit price", "item price"]);
    const totalIdx = findCol(headers, ["total", "item total", "order total"]);
    const dateIdx = findCol(headers, ["date", "order date", "purchase date"]);
    const taxIdx = findCol(headers, ["tax", "sales tax"]);
    const storeIdx = findCol(headers, ["store", "store name", "location", "fulfillment"]);
    const paymentIdx = findCol(headers, ["payment", "payment method", "payment type"]);
    const statusIdx = findCol(headers, ["status", "order status"]);

    const orderGroups = new Map<string, { items: ImportedOrderItem[]; row: string[] }>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 3) continue;

      const orderId = safeGet(row, orderIdIdx) || `walmart-${i}`;
      const title = safeGet(row, titleIdx) || "Unknown Item";
      const qty = parseInt(safeGet(row, qtyIdx)) || 1;
      const price = parsePrice(safeGet(row, priceIdx));
      const itemTotal = parsePrice(safeGet(row, totalIdx)) || price * qty;

      const item: ImportedOrderItem = {
        name: title,
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
        category: "Shopping",
      };

      if (!orderGroups.has(orderId)) {
        orderGroups.set(orderId, { items: [], row });
      }
      orderGroups.get(orderId)!.items.push(item);
    }

    const orders: ImportedOrder[] = [];

    for (const [orderId, { items, row }] of orderGroups) {
      const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
      const tax = parsePrice(safeGet(row, taxIdx));
      const total = parsePrice(safeGet(row, totalIdx)) || subtotal + tax;

      const dateStr = safeGet(row, dateIdx);
      const orderDate = dateStr ? new Date(dateStr) : new Date();

      const store = safeGet(row, storeIdx);
      const status = safeGet(row, statusIdx).toLowerCase();

      orders.push({
        id: orderId,
        provider: "walmart",
        rawData: { orderId, itemCount: items.length },
        merchantName: "Walmart",
        merchantLocation: store || undefined,
        items,
        subtotal,
        tax,
        shipping: 0,
        discount: 0,
        total,
        currency: "USD",
        paymentMethod: safeGet(row, paymentIdx) || undefined,
        orderDate,
        status: status.includes("cancel") ? "cancelled" : "completed",
      });
    }

    return orders.filter((o) => o.status === "completed");
  },

  normalizeOrder(order: ImportedOrder) {
    return {
      source: "manual" as const,
      merchant: {
        rawName: "Walmart",
        canonicalName: "Walmart",
        category: "Shopping",
        location: order.merchantLocation ?? null,
      },
      purchase: {
        purchasedAt: order.orderDate.toISOString(),
        currency: order.currency,
        subtotal: order.subtotal,
        tax: order.tax,
        tip: 0,
        discount: order.discount,
        fees: order.shipping,
        total: order.total,
      },
      payment: {
        method: order.paymentMethod ?? "card",
        cardId: null,
        cardLast4: order.cardLast4 ?? null,
        walletType: null,
        entryMode: null,
      },
      items: order.items.map((item) => ({
        rawName: item.name,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        category: "Shopping",
      })),
      metadata: {
        confidence: 0.95,
        requiresReview: false,
      },
    };
  },
};

function parseCSV(content: string): string[][] {
  const lines: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && content[i + 1] === "\n")) {
        current.push(field);
        field = "";
        if (current.some((c) => c.trim())) lines.push(current);
        current = [];
        if (ch === "\r") i++;
      } else {
        field += ch;
      }
    }
  }
  if (field || current.length > 0) {
    current.push(field);
    if (current.some((c) => c.trim())) lines.push(current);
  }

  return lines;
}

function findCol(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c);
    if (idx >= 0) return idx;
  }
  return -1;
}

function safeGet(row: string[], idx: number): string {
  if (idx < 0 || idx >= row.length) return "";
  return row[idx].trim();
}

function parsePrice(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  return Math.abs(parseFloat(cleaned)) || 0;
}
