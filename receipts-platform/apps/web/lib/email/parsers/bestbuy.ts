import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const bestbuyParser: EmailParser = {
  id: "bestbuy",

  canParse(senderEmail: string, subject: string) {
    const sender = senderEmail.toLowerCase();
    return (
      (sender.includes("@bestbuy.com") || sender.includes("@emailinfo.bestbuy.com")) &&
      /receipt|order|confirm|purchase/i.test(subject)
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
  let shipping = 0;
  let discount = 0;
  let orderDate = "";
  let cardLast4: string | null = null;

  // Best Buy order confirmation: items in table rows or structured divs
  $("tr, [class*='item'], [class*='product'], [class*='line-item']").each((_, el) => {
    const rowText = $(el).text().replace(/\s+/g, " ").trim();

    // Match "Product Name  $99.99" or "Product Name Qty: 2 $199.98"
    const qtyPriceMatch = rowText.match(/(.+?)\s+(?:qty|quantity)[:\s]*(\d+)\s+\$(\d+\.\d{2})/i);
    const simplePriceMatch = rowText.match(/(.+?)\s+\$(\d+\.\d{2})/);

    if (qtyPriceMatch && !rowText.match(/tax|total|subtotal|shipping|discount|savings|reward/i)) {
      const name = qtyPriceMatch[1].trim();
      const qty = parseInt(qtyPriceMatch[2]);
      const price = parseFloat(qtyPriceMatch[3]);
      if (name.length > 2 && name.length < 250 && price > 0) {
        items.push({
          rawName: name,
          name: cleanItemName(name),
          quantity: qty,
          unitPrice: price / qty,
          totalPrice: price,
          category: "Electronics",
        });
      }
    } else if (simplePriceMatch && !rowText.match(/tax|total|subtotal|shipping|discount|savings|reward|member|point/i)) {
      const name = simplePriceMatch[1].trim();
      const price = parseFloat(simplePriceMatch[2]);
      if (name.length > 2 && name.length < 250 && price > 0) {
        // Check for inline quantity
        const inlineQty = name.match(/(?:qty|x)\s*(\d+)/i);
        const qty = inlineQty ? parseInt(inlineQty[1]) : 1;
        items.push({
          rawName: name,
          name: cleanItemName(name),
          quantity: qty,
          unitPrice: price / qty,
          totalPrice: price,
          category: "Electronics",
        });
      }
    }
  });

  // Extract totals
  const totalMatch =
    bodyText.match(/order\s*total[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/grand\s*total[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/total[:\s]*\$(\d+\.\d{2})/i);
  if (totalMatch) total = parseFloat(totalMatch[1]);

  const subtotalMatch = bodyText.match(/(?:item|sub)\s*total[:\s]*\$(\d+\.\d{2})/i);
  if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

  const taxMatch = bodyText.match(/(?:estimated\s*)?tax[:\s]*\$(\d+\.\d{2})/i);
  if (taxMatch) tax = parseFloat(taxMatch[1]);

  const shippingMatch = bodyText.match(/shipping[:\s&;]*(?:handling)?[:\s]*\$(\d+\.\d{2})/i);
  if (shippingMatch) shipping = parseFloat(shippingMatch[1]);

  const discountMatch =
    bodyText.match(/(?:discount|savings)[:\s]*-?\$(\d+\.\d{2})/i) ??
    bodyText.match(/member\s*(?:discount|savings)[:\s]*-?\$(\d+\.\d{2})/i);
  if (discountMatch) discount = parseFloat(discountMatch[1]);

  // Date extraction
  const dateMatch =
    bodyText.match(/(?:order(?:ed)?|placed|date)[:\s]*(\w+ \d{1,2},? \d{4})/i) ??
    bodyText.match(/(?:order(?:ed)?|placed|date)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) ??
    bodyText.match(/(\w+ \d{1,2},? \d{4})/);
  if (dateMatch) orderDate = dateMatch[1];

  // Card info
  const cardMatch =
    bodyText.match(/ending\s*in\s*(\d{4})/i) ??
    bodyText.match(/\*{3,}(\d{4})/) ??
    bodyText.match(/card[:\s]*.*?(\d{4})\b/i);
  if (cardMatch) cardLast4 = cardMatch[1];

  if (total === 0 && items.length === 0) return null;

  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  }
  if (!total) total = subtotal + tax + shipping - discount;

  return {
    merchant: {
      rawName: "Best Buy",
      canonicalName: "Best Buy",
      category: "Electronics",
      location: null,
    },
    purchase: {
      purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal: subtotal || total - tax - shipping + discount,
      tax,
      tip: 0,
      discount,
      fees: shipping,
      total,
    },
    payment: {
      method: "card",
      cardLast4,
      walletType: null,
      entryMode: null,
    },
    items,
    metadata: {
      confidence: items.length > 0 ? 0.85 : 0.7,
      requiresReview: items.length === 0,
    },
  };
}

function parsePlainText(text: string): ParsedEmailReceipt | null {
  if (!text) return null;

  const items: ParsedEmailReceipt["items"] = [];
  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let shipping = 0;
  let discount = 0;
  let orderDate = "";
  let cardLast4: string | null = null;
  let inItems = false;

  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect item section
    if (/items?\s*ordered|order\s*details|order\s*summary/i.test(trimmed)) {
      inItems = true;
      continue;
    }
    if (/^-{3,}$/.test(trimmed) || /subtotal|order total|^total/i.test(trimmed)) {
      inItems = false;
    }

    // Extract items
    if (inItems) {
      const priceMatch = trimmed.match(/^(.+?)\s+\$(\d+\.\d{2})\s*$/);
      if (priceMatch && !trimmed.match(/tax|shipping|discount|savings/i)) {
        const name = priceMatch[1].trim();
        const price = parseFloat(priceMatch[2]);
        if (name.length > 1 && price > 0) {
          items.push({
            rawName: name,
            name: cleanItemName(name),
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            category: "Electronics",
          });
        }
      }
    }

    // Even outside item section, try to pick up items with price
    if (!inItems && items.length === 0) {
      const priceMatch = trimmed.match(/^(.+?)\s+\$(\d+\.\d{2})\s*$/);
      if (priceMatch && !trimmed.match(/tax|total|subtotal|shipping|discount|savings|reward|member|point/i)) {
        const name = priceMatch[1].trim();
        const price = parseFloat(priceMatch[2]);
        if (name.length > 2 && name.length < 250 && price > 0) {
          items.push({
            rawName: name,
            name: cleanItemName(name),
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            category: "Electronics",
          });
        }
      }
    }

    // Totals
    const totalMatch = trimmed.match(/(?:order\s*)?total[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    const subtotalMatch = trimmed.match(/(?:item|sub)\s*total[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    const taxMatch = trimmed.match(/tax[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    const shippingMatch = trimmed.match(/shipping[:\s]*\$(\d+\.\d{2})/i);
    if (shippingMatch) shipping = parseFloat(shippingMatch[1]);

    const discountMatch = trimmed.match(/(?:discount|savings)[:\s]*-?\$(\d+\.\d{2})/i);
    if (discountMatch) discount = parseFloat(discountMatch[1]);

    const dateMatch = trimmed.match(/(?:order|placed|date).*?(\w+ \d{1,2},? \d{4})/i) ??
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
  if (!total) total = subtotal + tax + shipping - discount;

  return {
    merchant: {
      rawName: "Best Buy",
      canonicalName: "Best Buy",
      category: "Electronics",
      location: null,
    },
    purchase: {
      purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal: subtotal || total - tax - shipping + discount,
      tax,
      tip: 0,
      discount,
      fees: shipping,
      total,
    },
    payment: {
      method: "card",
      cardLast4,
      walletType: null,
      entryMode: null,
    },
    items,
    metadata: {
      confidence: items.length > 0 ? 0.85 : 0.65,
      requiresReview: items.length === 0,
    },
  };
}

function cleanItemName(name: string): string {
  return name
    .replace(/(?:qty|quantity)[:\s]*\d+/i, "")
    .replace(/sku[:\s]*\w+/i, "")
    .replace(/model[:\s]*\w+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 200);
}
