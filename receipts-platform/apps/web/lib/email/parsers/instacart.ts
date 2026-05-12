import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const instacartParser: EmailParser = {
  id: "instacart",

  canParse(senderEmail: string, subject: string) {
    return (
      senderEmail.toLowerCase().includes("@instacart.com") &&
      /receipt|order|deliver/i.test(subject)
    );
  },

  parse(html: string, plainText: string): ParsedEmailReceipt | null {
    const $ = html ? cheerio.load(html) : null;
    const text = $ ? $.text() : plainText;
    if (!text) return null;

    const items: ParsedEmailReceipt["items"] = [];
    let total = 0;
    let subtotal = 0;
    let tax = 0;
    let tip = 0;
    let fees = 0;
    let storeName = "Instacart";
    let orderDate = "";

    // Store name
    const storeMatch = text.match(/(?:your|from)\s+(\w[\w\s']*?)\s+(?:order|delivery|receipt)/i);
    if (storeMatch) storeName = storeMatch[1].trim();

    // Parse items from HTML
    if ($) {
      $("tr, [class*='item'], [class*='product']").each((_, el) => {
        const rowText = $(el).text().replace(/\s+/g, " ").trim();
        // Instacart: "Item Name qty x $price $total" or "Item Name $price"
        const qtyMatch = rowText.match(/(.+?)\s+(\d+)\s*[x×]\s*\$(\d+\.\d{2})\s+\$(\d+\.\d{2})/);
        const simpleMatch = rowText.match(/(.+?)\s+\$(\d+\.\d{2})/);

        if (qtyMatch && !rowText.match(/tax|fee|tip|total|subtotal|delivery|service/i)) {
          items.push({
            rawName: qtyMatch[1].trim(),
            name: qtyMatch[1].trim(),
            quantity: parseInt(qtyMatch[2]),
            unitPrice: parseFloat(qtyMatch[3]),
            totalPrice: parseFloat(qtyMatch[4]),
            category: "Groceries",
          });
        } else if (simpleMatch && !rowText.match(/tax|fee|tip|total|subtotal|delivery|service|savings/i)) {
          const name = simpleMatch[1].trim();
          if (name.length > 2 && name.length < 150) {
            items.push({
              rawName: name,
              name,
              quantity: 1,
              unitPrice: parseFloat(simpleMatch[2]),
              totalPrice: parseFloat(simpleMatch[2]),
              category: "Groceries",
            });
          }
        }
      });
    }

    const totalMatch = text.match(/(?:order\s*)?total[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    const subtotalMatch = text.match(/(?:item\s*)?subtotal[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    const taxMatch = text.match(/tax[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    const tipMatch = text.match(/tip[:\s]*\$(\d+\.\d{2})/i);
    if (tipMatch) tip = parseFloat(tipMatch[1]);

    const feeMatch = text.match(/(?:service|delivery)\s*fee[:\s]*\$(\d+\.\d{2})/i);
    if (feeMatch) fees = parseFloat(feeMatch[1]);

    const dateMatch = text.match(/(\w+ \d{1,2},? \d{4})/);
    if (dateMatch) orderDate = dateMatch[1];

    if (total === 0) return null;

    return {
      merchant: {
        rawName: storeName,
        canonicalName: `${storeName} (Instacart)`,
        category: "Groceries",
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
