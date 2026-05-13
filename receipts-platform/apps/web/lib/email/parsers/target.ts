import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const targetParser: EmailParser = {
  id: "target",

  canParse(senderEmail: string, subject: string) {
    return (
      senderEmail.toLowerCase().includes("@target.com") &&
      /order|receipt|confirm|pickup/i.test(subject)
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
  let storeLocation: string | null = null;

  // Target order confirmations: items in structured table rows or divs
  $("tr, [class*='item'], [class*='product'], [class*='line-item'], [class*='cartItem']").each((_, el) => {
    const rowText = $(el).text().replace(/\s+/g, " ").trim();

    // Match "Product Name Qty: 2 $19.98" or "Product Name $9.99"
    const qtyPriceMatch = rowText.match(/(.+?)\s+(?:qty|quantity)[:\s]*(\d+)\s+\$(\d+\.\d{2})/i);
    const simplePriceMatch = rowText.match(/(.+?)\s+\$(\d+\.\d{2})/);

    if (qtyPriceMatch && !rowText.match(/tax|total|subtotal|shipping|discount|savings|estimated|circle/i)) {
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
          category: categorizeTargetItem(name),
        });
      }
    } else if (simplePriceMatch && !rowText.match(/tax|total|subtotal|shipping|discount|savings|estimated|circle|redcard/i)) {
      const name = simplePriceMatch[1].trim();
      const price = parseFloat(simplePriceMatch[2]);
      if (name.length > 2 && name.length < 250 && price > 0) {
        const inlineQty = name.match(/(?:qty|x)\s*(\d+)/i);
        const qty = inlineQty ? parseInt(inlineQty[1]) : 1;
        items.push({
          rawName: name,
          name: cleanItemName(name),
          quantity: qty,
          unitPrice: price / qty,
          totalPrice: price,
          category: categorizeTargetItem(name),
        });
      }
    }
  });

  // Extract totals
  const totalMatch =
    bodyText.match(/(?:order|estimated)\s*total[:\s]*\$(\d+\.\d{2})/i) ??
    bodyText.match(/total[:\s]*\$(\d+\.\d{2})/i);
  if (totalMatch) total = parseFloat(totalMatch[1]);

  const subtotalMatch = bodyText.match(/(?:item|sub)\s*total[:\s]*\$(\d+\.\d{2})/i);
  if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

  const taxMatch = bodyText.match(/(?:estimated\s*)?tax[:\s]*\$(\d+\.\d{2})/i);
  if (taxMatch) tax = parseFloat(taxMatch[1]);

  const shippingMatch = bodyText.match(/shipping[:\s&;]*(?:handling)?[:\s]*\$(\d+\.\d{2})/i);
  if (shippingMatch) shipping = parseFloat(shippingMatch[1]);

  // Target Circle or RedCard discount
  const discountMatch =
    bodyText.match(/(?:discount|savings|circle\s*(?:earnings|savings))[:\s]*-?\$(\d+\.\d{2})/i) ??
    bodyText.match(/redcard\s*(?:discount|savings)[:\s]*-?\$(\d+\.\d{2})/i);
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
    bodyText.match(/redcard[:\s]*.*?(\d{4})/i);
  if (cardMatch) cardLast4 = cardMatch[1];

  // Store location for pickup orders
  const locationMatch = bodyText.match(/(?:pickup\s*(?:at|from)|store)[:\s]*(.+?)(?:\n|$)/i);
  if (locationMatch) storeLocation = locationMatch[1].trim().slice(0, 100);

  if (total === 0 && items.length === 0) return null;

  if (!subtotal && items.length > 0) {
    subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  }
  if (!total) total = subtotal + tax + shipping - discount;

  return {
    merchant: {
      rawName: "Target",
      canonicalName: "Target",
      category: "Shopping",
      location: storeLocation,
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

    // Detect item section boundaries
    if (/items?\s*ordered|order\s*(?:details|summary|items)/i.test(trimmed)) {
      inItems = true;
      continue;
    }
    if (/^-{3,}$/.test(trimmed) || /^(?:sub)?total|order total|estimated total/i.test(trimmed)) {
      inItems = false;
    }

    // Extract items in the items section
    if (inItems) {
      const priceMatch = trimmed.match(/^(.+?)\s+\$(\d+\.\d{2})\s*$/);
      if (priceMatch && !trimmed.match(/tax|shipping|discount|savings/i)) {
        const name = priceMatch[1].trim();
        const price = parseFloat(priceMatch[2]);
        if (name.length > 1 && price > 0) {
          const qtyMatch = name.match(/(?:qty|x)\s*(\d+)/i);
          const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
          items.push({
            rawName: name,
            name: cleanItemName(name),
            quantity: qty,
            unitPrice: price / qty,
            totalPrice: price,
            category: categorizeTargetItem(name),
          });
        }
      }
    }

    // Totals
    const totalMatch = trimmed.match(/(?:order|estimated)?\s*total[:\s]*\$(\d+\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1]);

    const subtotalMatch = trimmed.match(/(?:item|sub)\s*total[:\s]*\$(\d+\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1]);

    const taxMatch = trimmed.match(/tax[:\s]*\$(\d+\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1]);

    const shippingMatch = trimmed.match(/shipping[:\s]*\$(\d+\.\d{2})/i);
    if (shippingMatch) shipping = parseFloat(shippingMatch[1]);

    const discountMatch = trimmed.match(/(?:discount|savings|circle)[:\s]*-?\$(\d+\.\d{2})/i);
    if (discountMatch) discount = parseFloat(discountMatch[1]);

    const dateMatch = trimmed.match(/(?:order|placed|date).*?(\w+ \d{1,2},? \d{4})/i) ??
      trimmed.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch && !orderDate) orderDate = dateMatch[1];

    const cardMatch = trimmed.match(/ending\s*in\s*(\d{4})/i) ??
      trimmed.match(/\*{3,}(\d{4})/);
    if (cardMatch) cardLast4 = cardMatch[1];
  }

  // Fallback date extraction
  if (!orderDate) {
    const fallbackDate = text.match(/(\w+ \d{1,2},? \d{4})/);
    if (fallbackDate) orderDate = fallbackDate[1];
  }

  if (total === 0 && items.length === 0) return null;

  if (!subtotal) subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  if (!total) total = subtotal + tax + shipping - discount;

  return {
    merchant: {
      rawName: "Target",
      canonicalName: "Target",
      category: "Shopping",
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
    .replace(/(?:dpci|tcin|upc)[:\s]*[\w-]+/i, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 200);
}

function categorizeTargetItem(name: string): string {
  if (/grocery|food|snack|drink|beverage|cereal|milk|bread|fruit|vegetable|meat|cheese/i.test(name)) {
    return "Groceries";
  }
  if (/clothing|shirt|pants|dress|shoe|jacket|apparel/i.test(name)) {
    return "Clothing";
  }
  if (/electronic|phone|tablet|laptop|headphone|speaker|cable|charger|tv|monitor/i.test(name)) {
    return "Electronics";
  }
  return "Shopping";
}
