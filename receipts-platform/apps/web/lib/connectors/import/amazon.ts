import type { ImportConnector, ImportedOrder, ImportedOrderItem } from "./types";

export const amazonImportConnector: ImportConnector = {
  id: "amazon",
  name: "Amazon",
  description: "Import order history from your Amazon data export (CSV)",
  icon: "amazon",
  supportedFormats: ["csv"],
  instructions:
    "Go to amazon.com/gp/b2b/reports → select 'Items' report type → choose date range → download CSV. Or use amazon.com/hz/privacy-central/data-requests to request your full order history.",

  async parseFile(content: string, fileName: string) {
    const rows = parseCSV(content);
    if (rows.length === 0) return [];

    const headers = rows[0].map((h) => h.trim().toLowerCase());

    const orderIdIdx = findCol(headers, ["order id", "order_id", "orderid"]);
    const titleIdx = findCol(headers, ["title", "product name", "item title"]);
    const qtyIdx = findCol(headers, ["quantity", "qty"]);
    const priceIdx = findCol(headers, ["item total", "item subtotal", "purchase price per unit", "unit price"]);
    const totalIdx = findCol(headers, ["item total", "total owed", "total"]);
    const dateIdx = findCol(headers, ["order date", "date", "purchase date"]);
    const categoryIdx = findCol(headers, ["category", "product category"]);
    const asinIdx = findCol(headers, ["asin", "asin/isbn"]);
    const sellerIdx = findCol(headers, ["seller", "sold by"]);
    const shippingIdx = findCol(headers, ["shipping charge", "shipping"]);
    const taxIdx = findCol(headers, ["tax", "item tax", "tax charged"]);
    const paymentIdx = findCol(headers, ["payment instrument type", "payment method"]);
    const cardIdx = findCol(headers, ["last 4 digits", "card last 4"]);

    const orderGroups = new Map<string, { items: ImportedOrderItem[]; row: string[] }>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 3) continue;

      const orderId = safeGet(row, orderIdIdx) || `row-${i}`;
      const title = safeGet(row, titleIdx) || "Unknown Item";
      const qty = parseInt(safeGet(row, qtyIdx)) || 1;
      const unitPrice = parsePrice(safeGet(row, priceIdx));
      const itemTotal = parsePrice(safeGet(row, totalIdx)) || unitPrice * qty;

      const item: ImportedOrderItem = {
        name: title,
        quantity: qty,
        unitPrice,
        totalPrice: itemTotal,
        category: safeGet(row, categoryIdx) || undefined,
        asin: safeGet(row, asinIdx) || undefined,
      };

      if (!orderGroups.has(orderId)) {
        orderGroups.set(orderId, { items: [], row });
      }
      orderGroups.get(orderId)!.items.push(item);
    }

    const orders: ImportedOrder[] = [];

    for (const [orderId, { items, row }] of orderGroups) {
      const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
      const shipping = parsePrice(safeGet(row, shippingIdx));
      const tax = parsePrice(safeGet(row, taxIdx));
      const total = subtotal + shipping + tax;

      const dateStr = safeGet(row, dateIdx);
      const orderDate = dateStr ? new Date(dateStr) : new Date();

      const seller = safeGet(row, sellerIdx);

      orders.push({
        id: orderId,
        provider: "amazon",
        rawData: { orderId, itemCount: items.length },
        merchantName: seller || "Amazon",
        items,
        subtotal,
        tax,
        shipping,
        discount: 0,
        total,
        currency: "USD",
        paymentMethod: safeGet(row, paymentIdx) || undefined,
        cardLast4: safeGet(row, cardIdx) || undefined,
        orderDate,
        status: "completed",
      });
    }

    return orders;
  },

  normalizeOrder(order: ImportedOrder) {
    return {
      source: "manual" as const,
      merchant: {
        rawName: order.merchantName,
        canonicalName: order.merchantName === "Amazon" ? "Amazon" : `Amazon (${order.merchantName})`,
        category: "Shopping",
        location: null,
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
        category: item.category ?? "Shopping",
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
