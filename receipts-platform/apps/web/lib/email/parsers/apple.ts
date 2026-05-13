import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const appleParser: EmailParser = {
  id: "apple",

  canParse(senderEmail: string, subject: string) {
    return (
      senderEmail.toLowerCase().includes("@apple.com") &&
      /receipt|invoice|purchase|subscription/i.test(subject)
    );
  },

  parse(html: string, plainText: string, subject: string): ParsedEmailReceipt | null {
    if (html) {
      const result = parseHtml(html, subject);
      if (result) return result;
    }
    return parsePlainText(plainText, subject);
  },
};

function isServiceItem(name: string): boolean {
  return /apple\s*music|icloud|apple\s*tv|apple\s*arcade|apple\s*news|apple\s*one|apple\s*fitness|apple\s*care|storage|subscription/i.test(name);
}

function categorizeItem(name: string): string {
  if (isServiceItem(name)) return "Subscriptions";
  return "Shopping";
}

function determineOverallCategory(items: ParsedEmailReceipt["items"], subject: string): string {
  if (/subscription|renewal/i.test(subject)) return "Subscriptions";
  if (items.length === 0) return "Shopping";
  const serviceCount = items.filter((i) => i.category === "Subscriptions").length;
  return serviceCount > items.length / 2 ? "Subscriptions" : "Shopping";
}

function parseHtml(html: string, subject: string): ParsedEmailReceipt | null {
  const $ = cheerio.load(html);
  const bodyText = $.text();

  const items: ParsedEmailReceipt["items"] = [];
  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let orderDate = "";
  let cardLast4: string | null = null;

  // Apple receipts use structured HTML tables with items and prices
  $("tr, [class*='item'], [class*='product'], [class*='line']").each((_, el) => {
    const rowText = $(el).text().replace(/\s+/g, " ").trim();

    // Match item name followed by a price: "App Name $9.99" or "Apple Music Subscription $10.99"
    const itemMatch = rowText.match(/(.+?)\s+\$(\d+\.\d{2})/);
    if (itemMatch && !rowText.match(/tax|total|subtotal|billing|amount|payment|balance|apple\s*id|document/i)) {
      const name = itemMatch[1].trim();
      const price = parseFloat(itemMatch[2]);
      if (name.length > 1 && name.length < 200 && price > 0) {
        // Check for quantity indicators
        const qtyMatch = name.match(/(?:qty|x)\s*(\d+)/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        const cleanName = name.replace(/(?:qty|x)\s*\d+/i, "").trim();
        items.push({
          rawName: name,
          name: cleanName,
          quantity: qty,
          unitPrice: price / qty,
          totalPrice: price,
          category: categorizeItem(name),
        });
      }
    }
  });

  // Extract totals from body text
  const totalMatch =
    bodyText.match(/(?:order\s*)?total[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/amount\s*(?:billed|charged)[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/(?:you\s*(?:were|was)\s*charged)[:\s]*\$(\d+\.\d{2})/i);
  if (totalMatch) total = parseFloat(totalMatch[1]);

  const subtotalMatch = bodyText.match(/subtotal[:\s]*\$(\d+\.\d{2})/i);
  if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

  const taxMatch = bodyText.match(/tax[:\s]*\$(\d+\.\d{2})/i);
  if (taxMatch) tax = parseFloat(taxMatch[1]);

  // Date extraction: Apple uses various formats
  const dateMatch =
    bodyText.match(/(?:billed?|date|invoice\s*date|order\s*date)[:\s]*(\w+ \d{1,2},? \d{4})/i) ??
    bodyText.match(/(?:billed?|date|invoice\s*date|order\s*date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ??
    bodyText.match(/(\w+ \d{1,2},? \d{4})/);
  if (dateMatch) orderDate = dateMatch[1];

  // Card info
  const cardMatch =
    bodyText.match(/ending\s*in\s*(\d{4})/i) ??
    bodyText.match(/\*{3,}(\d{4})/) ??
    bodyText.match(/card[:\s]*.*?(\d{4})\s*$/im);
  if (cardMatch) cardLast4 = cardMatch[1];

  if (total === 0 && items.length === 0) return null;

  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  }
  if (!total) total = subtotal + tax;

  const category = determineOverallCategory(items, subject);

  return {
    merchant: {
      rawName: "Apple",
      canonicalName: "Apple",
      category,
      location: null,
    },
    purchase: {
      purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal: subtotal || total - tax,
      tax,
      tip: 0,
      discount: 0,
      fees: 0,
      total,
    },
    payment: {
      method: "card",
      cardLast4,
      walletType: "Apple Pay",
      entryMode: null,
    },
    items,
    metadata: {
      confidence: items.length > 0 ? 0.85 : 0.7,
      requiresReview: items.length === 0,
    },
  };
}

function parsePlainText(text: string, subject: string): ParsedEmailReceipt | null {
  if (!text) return null;

  const items: ParsedEmailReceipt["items"] = [];
  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let orderDate = "";
  let cardLast4: string | null = null;

  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Match items: "Some App Name  $4.99" or "iCloud+ 50GB  $0.99"
    const priceMatch = trimmed.match(/^(.+?)\s{2,}\$(\d+\.\d{2})\s*$/);
    if (priceMatch && !trimmed.match(/tax|total|subtotal|billing|payment|amount|balance/i)) {
      const name = priceMatch[1].trim();
      const price = parseFloat(priceMatch[2]);
      if (name.length > 1 && name.length < 200 && price > 0) {
        items.push({
          rawName: name,
          name,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          category: categorizeItem(name),
        });
      }
    }

    // Also try single-space separated for plain text
    if (items.length === 0) {
      const simpleMatch = trimmed.match(/^(.+?)\s+\$(\d+\.\d{2})\s*$/);
      if (simpleMatch && !trimmed.match(/tax|total|subtotal|billing|payment|amount|balance/i)) {
        const name = simpleMatch[1].trim();
        const price = parseFloat(simpleMatch[2]);
        if (name.length > 2 && name.length < 200 && price > 0) {
          items.push({
            rawName: name,
            name,
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            category: categorizeItem(name),
          });
        }
      }
    }

    // Totals
    const totalMatch = trimmed.match(/(?:order\s*)?total[:\s]*\$(\d+\.\d{2})/i) ??
      trimmed.match(/amount\s*(?:billed|charged)[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    const subtotalMatch = trimmed.match(/subtotal[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    const taxMatch = trimmed.match(/tax[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    const dateMatch = trimmed.match(/(?:billed?|date|invoice)[:\s]*(\w+ \d{1,2},? \d{4})/i) ??
      trimmed.match(/(?:billed?|date|invoice)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (dateMatch && !orderDate) orderDate = dateMatch[1];

    const cardMatch = trimmed.match(/ending\s*in\s*(\d{4})/i) ??
      trimmed.match(/\*{3,}(\d{4})/);
    if (cardMatch) cardLast4 = cardMatch[1];
  }

  // Fallback date extraction from the full text
  if (!orderDate) {
    const fallbackDate = text.match(/(\w+ \d{1,2},? \d{4})/);
    if (fallbackDate) orderDate = fallbackDate[1];
  }

  if (total === 0 && items.length === 0) return null;

  if (!subtotal) subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  if (!total) total = subtotal + tax;

  const category = determineOverallCategory(items, subject);

  return {
    merchant: {
      rawName: "Apple",
      canonicalName: "Apple",
      category,
      location: null,
    },
    purchase: {
      purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal: subtotal || total - tax,
      tax,
      tip: 0,
      discount: 0,
      fees: 0,
      total,
    },
    payment: {
      method: "card",
      cardLast4,
      walletType: "Apple Pay",
      entryMode: null,
    },
    items,
    metadata: {
      confidence: items.length > 0 ? 0.85 : 0.65,
      requiresReview: items.length === 0,
    },
  };
}
