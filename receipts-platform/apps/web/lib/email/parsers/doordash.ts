import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const doordashParser: EmailParser = {
  id: "doordash",

  canParse(senderEmail: string, subject: string) {
    return (
      senderEmail.toLowerCase().includes("@doordash.com") &&
      /receipt|order|confirm/i.test(subject)
    );
  },

  parse(html: string, plainText: string): ParsedEmailReceipt | null {
    const text = html ? cheerio.load(html).text() : plainText;
    if (!text) return null;

    const items: ParsedEmailReceipt["items"] = [];
    let total = 0;
    let subtotal = 0;
    let tax = 0;
    let tip = 0;
    let fees = 0;
    let merchantName = "DoorDash";
    let orderDate = "";

    // Extract restaurant name
    const restaurantMatch = text.match(/(?:from|order from|your order at)\s+(.+?)(?:\n|$)/i);
    if (restaurantMatch) merchantName = restaurantMatch[1].trim();

    // Extract items (qty x name $price pattern)
    if (html) {
      const $ = cheerio.load(html);
      $("tr, div, [class*='item']").each((_, el) => {
        const rowText = $(el).text().replace(/\s+/g, " ").trim();
        const itemMatch = rowText.match(/(\d+)\s*[x×]\s*(.+?)\s+\$(\d+\.\d{2})/) ??
          rowText.match(/(.+?)\s+\$(\d+\.\d{2})/);
        if (itemMatch && !rowText.match(/tax|fee|tip|total|subtotal|delivery|discount/i)) {
          if (itemMatch.length === 4) {
            items.push({
              rawName: itemMatch[2].trim(),
              name: itemMatch[2].trim(),
              quantity: parseInt(itemMatch[1]),
              unitPrice: parseFloat(itemMatch[3]) / parseInt(itemMatch[1]),
              totalPrice: parseFloat(itemMatch[3]),
              category: "Dining",
            });
          } else {
            const name = itemMatch[1].trim();
            if (name.length > 2 && name.length < 100) {
              items.push({
                rawName: name,
                name,
                quantity: 1,
                unitPrice: parseFloat(itemMatch[2]),
                totalPrice: parseFloat(itemMatch[2]),
                category: "Dining",
              });
            }
          }
        }
      });
    }

    const totalMatch = text.match(/total\s*(?:charged)?[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    const subtotalMatch = text.match(/subtotal[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    const taxMatch = text.match(/tax(?:es)?[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    const tipMatch = text.match(/(?:dasher\s*)?tip[:\s]*\$(\d+\.\d{2})/i);
    if (tipMatch) tip = parseFloat(tipMatch[1]);

    const feeMatch = text.match(/(?:service|delivery)\s*fee[:\s]*\$(\d+\.\d{2})/i);
    if (feeMatch) fees = parseFloat(feeMatch[1]);

    const dateMatch = text.match(/(\w+ \d{1,2},? \d{4})/);
    if (dateMatch) orderDate = dateMatch[1];

    if (total === 0) return null;

    return {
      merchant: {
        rawName: merchantName,
        canonicalName: merchantName,
        category: "Dining",
        location: null,
      },
      purchase: {
        purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        currency: "USD",
        subtotal: subtotal || items.reduce((s, i) => s + i.totalPrice, 0),
        tax,
        tip,
        discount: 0,
        fees,
        total,
      },
      payment: { method: "card", cardLast4: null, walletType: null, entryMode: null },
      items,
      metadata: {
        confidence: items.length > 0 ? 0.85 : 0.7,
        requiresReview: items.length === 0,
      },
    };
  },
};
