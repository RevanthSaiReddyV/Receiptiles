import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const uberParser: EmailParser = {
  id: "uber",

  canParse(senderEmail: string, subject: string) {
    return (
      senderEmail.toLowerCase().includes("@uber.com") &&
      /receipt|trip|eats/i.test(subject)
    );
  },

  parse(html: string, plainText: string, subject: string): ParsedEmailReceipt | null {
    const isEats = /eats|delivery|food/i.test(subject);
    const text = html ? cheerio.load(html).text() : plainText;
    if (!text) return null;

    const items: ParsedEmailReceipt["items"] = [];
    let total = 0;
    let subtotal = 0;
    let tax = 0;
    let tip = 0;
    let fees = 0;
    let orderDate = "";

    const totalMatch = text.match(/total[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    const subtotalMatch = text.match(/subtotal[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    const taxMatch = text.match(/tax(?:es)?[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    const tipMatch = text.match(/tip[:\s]*\$(\d+\.\d{2})/i);
    if (tipMatch) tip = parseFloat(tipMatch[1]);

    const feeMatch = text.match(/(?:service|delivery|booking)\s*fee[:\s]*\$(\d+\.\d{2})/i);
    if (feeMatch) fees = parseFloat(feeMatch[1]);

    const dateMatch = text.match(/(\w+ \d{1,2},? \d{4})/);
    if (dateMatch) orderDate = dateMatch[1];

    // For Uber Eats, try to extract food items
    if (isEats && html) {
      const $ = cheerio.load(html);
      $("tr, [class*='item']").each((_, el) => {
        const rowText = $(el).text().replace(/\s+/g, " ").trim();
        const itemMatch = rowText.match(/(\d+)\s*x\s*(.+?)\s+\$(\d+\.\d{2})/);
        if (itemMatch) {
          items.push({
            rawName: itemMatch[2].trim(),
            name: itemMatch[2].trim(),
            quantity: parseInt(itemMatch[1]),
            unitPrice: parseFloat(itemMatch[3]) / parseInt(itemMatch[1]),
            totalPrice: parseFloat(itemMatch[3]),
            category: "Dining",
          });
        }
      });
    }

    // For rides, create a single "trip" item
    if (!isEats && total > 0) {
      const distMatch = text.match(/(\d+\.?\d*)\s*(?:mi|miles|km)/i);
      const tripName = distMatch ? `Uber ride (${distMatch[1]} mi)` : "Uber ride";
      items.push({
        rawName: tripName,
        name: tripName,
        quantity: 1,
        unitPrice: subtotal || total - tax - tip - fees,
        totalPrice: subtotal || total - tax - tip - fees,
        category: "Transportation",
      });
    }

    if (total === 0) return null;

    return {
      merchant: {
        rawName: isEats ? "Uber Eats" : "Uber",
        canonicalName: isEats ? "Uber Eats" : "Uber",
        category: isEats ? "Dining" : "Transportation",
        location: null,
      },
      purchase: {
        purchasedAt: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        currency: "USD",
        subtotal: subtotal || total - tax - tip - fees,
        tax,
        tip,
        discount: 0,
        fees,
        total,
      },
      payment: { method: "card", cardLast4: null, walletType: null, entryMode: null },
      items,
      metadata: {
        confidence: 0.9,
        requiresReview: false,
      },
    };
  },
};
