import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const starbucksParser: EmailParser = {
  id: "starbucks",

  canParse(senderEmail: string, subject: string) {
    return (
      senderEmail.toLowerCase().includes("@starbucks.com") &&
      /receipt|order|ready/i.test(subject)
    );
  },

  parse(html: string, plainText: string, subject: string): ParsedEmailReceipt | null {
    if (html) {
      const result = parseHtml(html);
      if (result) return result;
    }
    return parsePlainText(plainText);
  },
};

function parseHtml(html: string): ParsedEmailReceipt | null {
  const $ = cheerio.load(html);
  const bodyText = $.text();

  const items: ParsedEmailReceipt["items"] = [];
  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let tip = 0;
  let discount = 0;
  let orderDate = "";
  let cardLast4: string | null = null;
  let storeLocation: string | null = null;

  // Extract items from HTML structure
  // Starbucks receipts list drink/food items with sizes and customizations
  $("tr, [class*='item'], [class*='product'], [class*='line'], [class*='order']").each((_, el) => {
    const rowText = $(el).text().replace(/\s+/g, " ").trim();

    // Match patterns: "1x Grande Iced Latte $5.75" or "Grande Caffe Mocha  $5.95"
    const qtyMatch = rowText.match(/(\d+)\s*[x×]\s*(.+?)\s+\$(\d+\.\d{2})/);
    const simpleMatch = rowText.match(/(.+?)\s+\$(\d+\.\d{2})/);

    if (qtyMatch && !rowText.match(/tax|total|subtotal|discount|reward|tip|reload/i)) {
      const qty = parseInt(qtyMatch[1]);
      const name = qtyMatch[2].trim();
      const price = parseFloat(qtyMatch[3]);
      if (name.length > 1 && name.length < 150 && price > 0) {
        items.push({
          rawName: name,
          name: cleanDrinkName(name),
          quantity: qty,
          unitPrice: price / qty,
          totalPrice: price,
          category: "Dining",
        });
      }
    } else if (simpleMatch && !rowText.match(/tax|total|subtotal|discount|reward|tip|reload|balance|stars?|gift/i)) {
      const name = simpleMatch[1].trim();
      const price = parseFloat(simpleMatch[2]);
      if (name.length > 2 && name.length < 150 && price > 0) {
        items.push({
          rawName: name,
          name: cleanDrinkName(name),
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          category: "Dining",
        });
      }
    }
  });

  // Remove duplicate items that can occur from nested HTML elements
  const deduped = deduplicateItems(items);

  // Extract totals
  const totalMatch =
    bodyText.match(/(?:order\s*)?total[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/(?:amount\s*(?:charged|paid))[:\s]*\$(\d+\.\d{2})/i);
  if (totalMatch) total = parseFloat(totalMatch[1]);

  const subtotalMatch = bodyText.match(/subtotal[:\s]*\$(\d+\.\d{2})/i);
  if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

  const taxMatch = bodyText.match(/tax[:\s]*\$(\d+\.\d{2})/i);
  if (taxMatch) tax = parseFloat(taxMatch[1]);

  const tipMatch = bodyText.match(/tip[:\s]*\$(\d+\.\d{2})/i);
  if (tipMatch) tip = parseFloat(tipMatch[1]);

  // Starbucks Rewards discount
  const discountMatch =
    bodyText.match(/(?:discount|reward|stars?\s*(?:redeem|discount))[:\s]*-?\$(\d+\.\d{2})/i) ??
    bodyText.match(/(?:free\s*(?:drink|item)\s*(?:reward|redemption))[:\s]*-?\$(\d+\.\d{2})/i);
  if (discountMatch) discount = parseFloat(discountMatch[1]);

  // Date
  const dateMatch =
    bodyText.match(/(?:order(?:ed)?|date|placed)[:\s]*(\w+ \d{1,2},? \d{4})/i) ??
    bodyText.match(/(?:order(?:ed)?|date|placed)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ??
    bodyText.match(/(\w+ \d{1,2},? \d{4})/);
  if (dateMatch) orderDate = dateMatch[1];

  // Card info (Starbucks card or credit card)
  const cardMatch =
    bodyText.match(/ending\s*in\s*(\d{4})/i) ??
    bodyText.match(/\*{3,}(\d{4})/) ??
    bodyText.match(/(?:starbucks\s*)?card[:\s]*.*?(\d{4})/i);
  if (cardMatch) cardLast4 = cardMatch[1];

  // Store location
  const locationMatch = bodyText.match(/(?:store|location|pick\s*up\s*(?:at|from))[:\s]*(.+?)(?:\n|order|$)/i);
  if (locationMatch) storeLocation = locationMatch[1].trim().slice(0, 100);

  // Detect Starbucks Card / mobile payment
  const walletType = /starbucks\s*card|mobile\s*order|app\s*pay/i.test(bodyText)
    ? "Starbucks Card"
    : null;

  if (total === 0 && deduped.length === 0) return null;

  if (!subtotal && deduped.length > 0) {
    subtotal = deduped.reduce((s, i) => s + i.totalPrice, 0);
  }
  if (!total) total = subtotal + tax + tip - discount;

  return {
    merchant: {
      rawName: "Starbucks",
      canonicalName: "Starbucks",
      category: "Dining",
      location: storeLocation,
    },
    purchase: {
      purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal: subtotal || total - tax - tip + discount,
      tax,
      tip,
      discount,
      fees: 0,
      total,
    },
    payment: {
      method: walletType ? "mobile" : "card",
      cardLast4,
      walletType,
      entryMode: null,
    },
    items: deduped,
    metadata: {
      confidence: deduped.length > 0 ? 0.85 : 0.7,
      requiresReview: deduped.length === 0,
    },
  };
}

function parsePlainText(text: string): ParsedEmailReceipt | null {
  if (!text) return null;

  const items: ParsedEmailReceipt["items"] = [];
  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let tip = 0;
  let discount = 0;
  let orderDate = "";
  let cardLast4: string | null = null;

  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Item lines: "1x Grande Iced Caramel Macchiato $6.45" or "Venti Cold Brew  $4.95"
    const qtyMatch = trimmed.match(/^(\d+)\s*[x×]\s*(.+?)\s+\$(\d+\.\d{2})\s*$/);
    const simpleMatch = trimmed.match(/^(.+?)\s+\$(\d+\.\d{2})\s*$/);

    if (qtyMatch && !trimmed.match(/tax|total|subtotal|discount|reward|tip|reload/i)) {
      const qty = parseInt(qtyMatch[1]);
      const name = qtyMatch[2].trim();
      const price = parseFloat(qtyMatch[3]);
      if (name.length > 1 && price > 0) {
        items.push({
          rawName: name,
          name: cleanDrinkName(name),
          quantity: qty,
          unitPrice: price / qty,
          totalPrice: price,
          category: "Dining",
        });
      }
    } else if (simpleMatch && !trimmed.match(/tax|total|subtotal|discount|reward|tip|reload|balance|stars?|gift/i)) {
      const name = simpleMatch[1].trim();
      const price = parseFloat(simpleMatch[2]);
      if (name.length > 2 && name.length < 150 && price > 0) {
        items.push({
          rawName: name,
          name: cleanDrinkName(name),
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          category: "Dining",
        });
      }
    }

    // Totals
    const totalMatch = trimmed.match(/(?:order\s*)?total[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    const subtotalMatch = trimmed.match(/subtotal[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    const taxMatch = trimmed.match(/tax[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    const tipMatch = trimmed.match(/tip[:\s]*\$(\d+\.\d{2})/i);
    if (tipMatch) tip = parseFloat(tipMatch[1]);

    const discountMatch = trimmed.match(/(?:discount|reward)[:\s]*-?\$(\d+\.\d{2})/i);
    if (discountMatch) discount = parseFloat(discountMatch[1]);

    const dateMatch = trimmed.match(/(?:order|date|placed).*?(\w+ \d{1,2},? \d{4})/i) ??
      trimmed.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch && !orderDate) orderDate = dateMatch[1];

    const cardMatch = trimmed.match(/ending\s*in\s*(\d{4})/i) ??
      trimmed.match(/\*{3,}(\d{4})/);
    if (cardMatch) cardLast4 = cardMatch[1];
  }

  // Fallback date
  if (!orderDate) {
    const fallbackDate = text.match(/(\w+ \d{1,2},? \d{4})/);
    if (fallbackDate) orderDate = fallbackDate[1];
  }

  if (total === 0 && items.length === 0) return null;

  if (!subtotal) subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  if (!total) total = subtotal + tax + tip - discount;

  const walletType = /starbucks\s*card|mobile\s*order|app/i.test(text) ? "Starbucks Card" : null;

  return {
    merchant: {
      rawName: "Starbucks",
      canonicalName: "Starbucks",
      category: "Dining",
      location: null,
    },
    purchase: {
      purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal: subtotal || total - tax - tip + discount,
      tax,
      tip,
      discount,
      fees: 0,
      total,
    },
    payment: {
      method: walletType ? "mobile" : "card",
      cardLast4,
      walletType,
      entryMode: null,
    },
    items,
    metadata: {
      confidence: items.length > 0 ? 0.85 : 0.65,
      requiresReview: items.length === 0,
    },
  };
}

function cleanDrinkName(name: string): string {
  return name
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 150);
}

function deduplicateItems(items: ParsedEmailReceipt["items"]): ParsedEmailReceipt["items"] {
  const seen = new Map<string, ParsedEmailReceipt["items"][0]>();
  for (const item of items) {
    const key = `${item.name}|${item.totalPrice}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}
