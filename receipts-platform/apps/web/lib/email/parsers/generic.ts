import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const genericParser: EmailParser = {
  id: "generic",

  canParse() {
    return true;
  },

  parse(html: string, plainText: string, subject: string): ParsedEmailReceipt | null {
    const text = html ? cheerio.load(html).text() : plainText;
    if (!text || text.length < 30) return null;

    const items: ParsedEmailReceipt["items"] = [];
    let total = 0;
    let subtotal = 0;
    let tax = 0;
    let tip = 0;
    let merchantName = "";
    let orderDate = "";
    let cardLast4: string | null = null;

    // Try to get merchant from subject
    const subjectMerchant = subject
      .replace(/(?:receipt|order|confirm|invoice|payment|your|from|re:?|fwd?:?)/gi, "")
      .replace(/[#\d-]+/g, "")
      .trim();
    if (subjectMerchant.length > 1 && subjectMerchant.length < 50) {
      merchantName = subjectMerchant;
    }

    // Extract prices from the text
    const priceRegex = /\$(\d+\.\d{2})/g;
    const prices: number[] = [];
    let match;
    while ((match = priceRegex.exec(text)) !== null) {
      prices.push(parseFloat(match[1]));
    }

    // Total is usually the largest amount, or explicitly labeled
    const totalMatch = text.match(/(?:order\s*)?total[:\s]*\$(\d+\.\d{2})/i) ??
      text.match(/(?:amount|charged?)[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) {
      total = parseFloat(totalMatch[1]);
    } else if (prices.length > 0) {
      total = Math.max(...prices);
    }

    const subtotalMatch = text.match(/subtotal[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    const taxMatch = text.match(/tax[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    const tipMatch = text.match(/(?:tip|gratuity)[:\s]*\$(\d+\.\d{2})/i);
    if (tipMatch) tip = parseFloat(tipMatch[1]);

    const dateMatch = text.match(/(\w+ \d{1,2},?\s*\d{4})/) ??
      text.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) orderDate = dateMatch[1];

    const cardMatch = text.match(/(?:ending|last\s*4)[:\s]*(\d{4})/i) ??
      text.match(/\*{2,}(\d{4})/);
    if (cardMatch) cardLast4 = cardMatch[1];

    // Try to extract items: lines with a price at end
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length < 3 || trimmed.length > 200) continue;
      if (/tax|total|subtotal|shipping|fee|tip|discount|promo/i.test(trimmed)) continue;

      const itemMatch = trimmed.match(/^(.+?)\s+\$(\d+\.\d{2})\s*$/);
      if (itemMatch) {
        const name = itemMatch[1].trim();
        const price = parseFloat(itemMatch[2]);
        if (name.length > 1 && price > 0 && price < total * 1.1) {
          items.push({
            rawName: name,
            name,
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            category: "Uncategorized",
          });
        }
      }
    }

    if (total === 0) return null;
    if (!subtotal) subtotal = total - tax - tip;

    return {
      merchant: {
        rawName: merchantName || "Unknown",
        canonicalName: merchantName || "Unknown",
        category: "Uncategorized",
        location: null,
      },
      purchase: {
        purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        currency: "USD",
        subtotal,
        tax,
        tip,
        discount: 0,
        fees: 0,
        total,
      },
      payment: { method: "card", cardLast4, walletType: null, entryMode: null },
      items,
      metadata: {
        confidence: items.length > 0 ? 0.6 : 0.4,
        requiresReview: true,
      },
    };
  },
};
