import type { ImportConnector, ImportedOrder, ImportedOrderItem } from "./types";

export const shopImportConnector: ImportConnector = {
  id: "shop",
  name: "Shop (by Shopify)",
  description: "Import order history from the Shop app's email-based order tracking",
  icon: "shop",
  supportedFormats: ["csv", "json"],
  instructions:
    "Open the Shop app → Profile → Settings → Privacy → Request your data. You'll receive a download link via email with your order history.",

  async parseFile(content: string, fileName: string) {
    if (fileName.endsWith(".json")) {
      return parseShopJSON(content);
    }
    return parseShopCSV(content);
  },

  normalizeOrder(order: ImportedOrder) {
    return {
      source: "manual" as const,
      merchant: {
        rawName: order.merchantName,
        canonicalName: order.merchantName,
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
        method: order.paymentMethod ?? "unknown",
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
        confidence: 0.9,
        requiresReview: false,
      },
    };
  },
};

function parseShopJSON(content: string): ImportedOrder[] {
  try {
    const data = JSON.parse(content);
    const orders = Array.isArray(data) ? data : data.orders ?? data.data ?? [];

    return orders.map((order: Record<string, unknown>, idx: number) => {
      const items: ImportedOrderItem[] = ((order.line_items ?? order.items ?? []) as Array<Record<string, unknown>>).map(
        (item) => ({
          name: (item.title ?? item.name ?? "Item") as string,
          quantity: (item.quantity as number) ?? 1,
          unitPrice: parseFloat(String(item.price ?? item.unit_price ?? "0")),
          totalPrice:
            parseFloat(String(item.total ?? item.price ?? "0")) *
            ((item.quantity as number) ?? 1),
        })
      );

      const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);

      return {
        id: String(order.id ?? order.order_id ?? `shop-${idx}`),
        provider: "shop",
        rawData: order,
        merchantName: (order.vendor ?? order.store ?? order.merchant ?? "Shop Store") as string,
        items,
        subtotal,
        tax: parseFloat(String(order.tax ?? order.total_tax ?? "0")),
        shipping: parseFloat(String(order.shipping ?? order.shipping_total ?? "0")),
        discount: parseFloat(String(order.discount ?? order.total_discount ?? "0")),
        total: parseFloat(String(order.total ?? order.total_price ?? subtotal)),
        currency: (order.currency as string) ?? "USD",
        orderDate: new Date((order.created_at ?? order.date ?? new Date()) as string),
        status: "completed",
      };
    });
  } catch {
    return [];
  }
}

function parseShopCSV(content: string): ImportedOrder[] {
  const rows = parseCSV(content);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const orderIdIdx = findCol(headers, ["order", "order id", "order number"]);
  const storeIdx = findCol(headers, ["store", "merchant", "vendor", "shop"]);
  const titleIdx = findCol(headers, ["item", "product", "title", "item name"]);
  const qtyIdx = findCol(headers, ["quantity", "qty"]);
  const priceIdx = findCol(headers, ["price", "item price", "unit price"]);
  const totalIdx = findCol(headers, ["total", "order total"]);
  const dateIdx = findCol(headers, ["date", "order date", "created"]);

  const orderGroups = new Map<string, { items: ImportedOrderItem[]; row: string[] }>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;

    const orderId = safeGet(row, orderIdIdx) || `shop-${i}`;
    const title = safeGet(row, titleIdx) || "Unknown Item";
    const qty = parseInt(safeGet(row, qtyIdx)) || 1;
    const price = parsePrice(safeGet(row, priceIdx));

    const item: ImportedOrderItem = {
      name: title,
      quantity: qty,
      unitPrice: price,
      totalPrice: price * qty,
    };

    if (!orderGroups.has(orderId)) {
      orderGroups.set(orderId, { items: [], row });
    }
    orderGroups.get(orderId)!.items.push(item);
  }

  const orders: ImportedOrder[] = [];

  for (const [orderId, { items, row }] of orderGroups) {
    const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
    const total = parsePrice(safeGet(row, totalIdx)) || subtotal;
    const dateStr = safeGet(row, dateIdx);
    const store = safeGet(row, storeIdx);

    orders.push({
      id: orderId,
      provider: "shop",
      rawData: { orderId },
      merchantName: store || "Shop Store",
      items,
      subtotal,
      tax: 0,
      shipping: 0,
      discount: 0,
      total,
      currency: "USD",
      orderDate: dateStr ? new Date(dateStr) : new Date(),
      status: "completed",
    });
  }

  return orders;
}

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
