import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const amazonParser: EmailParser = {
  id: "amazon",

  canParse(senderEmail: string, subject: string) {
    const sender = senderEmail.toLowerCase();
    return (
      (sender.includes("@amazon.com") || sender.includes("@amazon.")) &&
      /order|confirm|ship|deliver|digital/i.test(subject)
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

  const items: ParsedEmailReceipt["items"] = [];
  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let shipping = 0;
  let orderDate = "";
  let cardLast4: string | null = null;

  // Amazon order confirmation format: items in table rows
  $("tr").each((_, row) => {
    const cells = $(row).find("td");
    const text = $(row).text();

    // Item rows typically contain product name + price
    const itemMatch = text.match(/(.+?)\s+\$(\d+\.\d{2})/);
    if (itemMatch && !text.match(/tax|shipping|total|subtotal|promotion|discount/i)) {
      const name = itemMatch[1].trim().replace(/\s+/g, " ");
      const price = parseFloat(itemMatch[2]);
      if (name.length > 2 && name.length < 200 && price > 0) {
        items.push({
          rawName: name,
          name: cleanItemName(name),
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
          category: "Shopping",
        });
      }
    }
  });

  // Extract totals
  const bodyText = $.text();

  const totalMatch = bodyText.match(/order\s*total[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/grand\s*total[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/total[:\s]*\$(\d+\.\d{2})/i);
  if (totalMatch) total = parseFloat(totalMatch[1]);

  const subtotalMatch = bodyText.match(/(?:item|sub)\s*total[:\s]*\$(\d+\.\d{2})/i);
  if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

  const taxMatch = bodyText.match(/(?:estimated\s*)?tax[:\s]*\$(\d+\.\d{2})/i);
  if (taxMatch) tax = parseFloat(taxMatch[1]);

  const shippingMatch = bodyText.match(/shipping[:\s&;]*(?:handling)?[:\s]*\$(\d+\.\d{2})/i);
  if (shippingMatch) shipping = parseFloat(shippingMatch[1]);

  const dateMatch = bodyText.match(/(?:order(?:ed)?|placed)\s*(?:on|date)?[:\s]*(\w+ \d{1,2},? \d{4})/i) ??
    bodyText.match(/(\w+ \d{1,2},? \d{4})/);
  if (dateMatch) orderDate = dateMatch[1];

  const cardMatch = bodyText.match(/ending\s*in\s*(\d{4})/i) ??
    bodyText.match(/\*{3,}(\d{4})/);
  if (cardMatch) cardLast4 = cardMatch[1];

  if (total === 0 && items.length === 0) return null;

  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  }
  if (!total) total = subtotal + tax + shipping;

  return {
    merchant: {
      rawName: "Amazon",
      canonicalName: "Amazon",
      category: "Shopping",
      location: null,
    },
    purchase: {
      purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal: subtotal || total - tax - shipping,
      tax,
      tip: 0,
      discount: 0,
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
  const lines = text.split("\n");

  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let shipping = 0;
  let orderDate = "";
  let cardLast4: string | null = null;
  let inItems = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/items?\s*ordered/i.test(trimmed)) {
      inItems = true;
      continue;
    }
    if (/^-{3,}$/.test(trimmed) || /subtotal|order total/i.test(trimmed)) {
      inItems = false;
    }

    if (inItems) {
      const priceMatch = trimmed.match(/^(.+?)\s+\$(\d+\.\d{2})\s*$/);
      if (priceMatch) {
        const name = priceMatch[1].trim();
        const price = parseFloat(priceMatch[2]);
        if (name.length > 1 && price > 0) {
          items.push({
            rawName: name,
            name: cleanItemName(name),
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            category: "Shopping",
          });
        }
      }
    }

    const totalMatch = trimmed.match(/order\s*total[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    const subtotalMatch = trimmed.match(/(?:item|sub)\s*total[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    const taxMatch = trimmed.match(/tax[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    const shippingMatch = trimmed.match(/shipping[:\s]*\$(\d+\.\d{2})/i);
    if (shippingMatch) shipping = parseFloat(shippingMatch[1]);

    const dateMatch = trimmed.match(/(?:order|placed).*?(\w+ \d{1,2},? \d{4})/i);
    if (dateMatch) orderDate = dateMatch[1];

    const cardMatch = trimmed.match(/ending\s*in\s*(\d{4})/i);
    if (cardMatch) cardLast4 = cardMatch[1];
  }

  if (total === 0 && items.length === 0) return null;

  if (!subtotal) subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  if (!total) total = subtotal + tax + shipping;

  return {
    merchant: {
      rawName: "Amazon",
      canonicalName: "Amazon",
      category: "Shopping",
      location: null,
    },
    purchase: {
      purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
      currency: "USD",
      subtotal,
      tax,
      tip: 0,
      discount: 0,
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
    .replace(/\s*Qty:\s*\d+/i, "")
    .replace(/\s*\(\d+ count\)/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 150);
}
