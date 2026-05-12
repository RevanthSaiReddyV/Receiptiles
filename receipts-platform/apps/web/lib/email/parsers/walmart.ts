import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const walmartParser: EmailParser = {
  id: "walmart",

  canParse(senderEmail: string, subject: string) {
    return (
      senderEmail.toLowerCase().includes("@walmart.com") &&
      /order|confirm|pickup|deliver|receipt/i.test(subject)
    );
  },

  parse(html: string, plainText: string): ParsedEmailReceipt | null {
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
  let orderDate = "";
  let cardLast4: string | null = null;

  // Walmart items usually in structured table or repeated divs
  $("tr, [class*='item'], [class*='product']").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const priceMatch = text.match(/(.+?)\s+\$(\d+\.\d{2})/);
    if (priceMatch && !text.match(/tax|total|subtotal|shipping|savings/i)) {
      const name = priceMatch[1].trim();
      const price = parseFloat(priceMatch[2]);
      if (name.length > 2 && name.length < 200 && price > 0) {
        const qtyMatch = name.match(/(?:qty|x)\s*(\d+)/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        items.push({
          rawName: name,
          name: name.replace(/(?:qty|x)\s*\d+/i, "").trim(),
          quantity: qty,
          unitPrice: price / qty,
          totalPrice: price,
          category: "Shopping",
        });
      }
    }
  });

  const totalMatch = bodyText.match(/order\s*total[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/total[:\s]*\$(\d+\.\d{2})/i);
  if (totalMatch) total = parseFloat(totalMatch[1]);

  const subtotalMatch = bodyText.match(/subtotal[:\s]*\$(\d+\.\d{2})/i);
  if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

  const taxMatch = bodyText.match(/(?:est\.?\s*)?tax[:\s]*\$(\d+\.\d{2})/i);
  if (taxMatch) tax = parseFloat(taxMatch[1]);

  const dateMatch = bodyText.match(/(\w+ \d{1,2},? \d{4})/);
  if (dateMatch) orderDate = dateMatch[1];

  const cardMatch = bodyText.match(/ending\s*in\s*(\d{4})/i) ??
    bodyText.match(/\*+(\d{4})/);
  if (cardMatch) cardLast4 = cardMatch[1];

  if (total === 0 && items.length === 0) return null;

  if (!subtotal) subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  if (!total) total = subtotal + tax;

  return {
    merchant: {
      rawName: "Walmart",
      canonicalName: "Walmart",
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
      fees: 0,
      total,
    },
    payment: { method: "card", cardLast4, walletType: null, entryMode: null },
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
  let tax = 0;

  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const priceMatch = trimmed.match(/^(.+?)\s+\$(\d+\.\d{2})\s*$/);
    if (priceMatch && !trimmed.match(/tax|total|subtotal|shipping|savings/i)) {
      items.push({
        rawName: priceMatch[1].trim(),
        name: priceMatch[1].trim(),
        quantity: 1,
        unitPrice: parseFloat(priceMatch[2]),
        totalPrice: parseFloat(priceMatch[2]),
        category: "Shopping",
      });
    }

    const totalMatch = trimmed.match(/total[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    const taxMatch = trimmed.match(/tax[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);
  }

  if (total === 0 && items.length === 0) return null;
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);

  return {
    merchant: {
      rawName: "Walmart",
      canonicalName: "Walmart",
      category: "Shopping",
      location: null,
    },
    purchase: {
      purchasedAt: new Date().toISOString(),
      currency: "USD",
      subtotal,
      tax,
      tip: 0,
      discount: 0,
      fees: 0,
      total: total || subtotal + tax,
    },
    payment: { method: "card", cardLast4: null, walletType: null, entryMode: null },
    items,
    metadata: { confidence: 0.65, requiresReview: true },
  };
}
