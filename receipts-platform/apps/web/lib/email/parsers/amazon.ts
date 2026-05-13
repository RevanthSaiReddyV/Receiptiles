import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const amazonParser: EmailParser = {
  id: "amazon",

  canParse(senderEmail: string, subject: string) {
    const sender = senderEmail.toLowerCase();
    return (
      (sender.includes("@amazon.com") || sender.includes("@amazon.")) &&
      /order|confirm|ship|deliver|digital|^ordered:/i.test(subject)
    );
  },

  parse(html: string, plainText: string, subject: string): ParsedEmailReceipt | null {
    if (html) {
      const result = parseHtml(html, subject);
      if (result) return result;
    }
    return parsePlainText(plainText);
  },
};

function parseHtml(html: string, subject: string): ParsedEmailReceipt | null {
  const $ = cheerio.load(html);
  const items: ParsedEmailReceipt["items"] = [];
  let total = 0;
  let subtotal = 0;
  let tax = 0;
  let shipping = 0;
  let orderDate = "";
  let cardLast4: string | null = null;
  let orderNumber = "";

  // Extract order number from subject
  const orderNumMatch = subject.match(/#?([\d-]{5,})/);
  if (orderNumMatch) orderNumber = orderNumMatch[1];

  // Strategy 1: Find item blocks with images
  // Amazon emails typically have product images in <img> tags near product names
  $("table tr, table tbody").each((_, el) => {
    const $el = $(el);
    const imgs = $el.find("img");
    const text = $el.text().replace(/\s+/g, " ").trim();

    // Skip rows that are obviously not items
    if (/tax|shipping|total|subtotal|promotion|discount|order.*placed/i.test(text) && !/qty|quantity/i.test(text)) return;

    // Look for product image
    let imageUrl: string | undefined;
    imgs.each((_, img) => {
      const src = $(img).attr("src") ?? "";
      // Amazon product images are on m.media-amazon.com or images-na.ssl-images-amazon.com
      if ((src.includes("media-amazon") || src.includes("images-amazon") || src.includes("ssl-images")) &&
          !src.includes("logo") && !src.includes("icon") && !src.includes("pixel") &&
          !src.includes("spacer") && !src.includes("arrow")) {
        const w = parseInt($(img).attr("width") ?? "0");
        if (w === 0 || w >= 40) {
          imageUrl = src;
        }
      }
    });

    // Look for product link
    let productUrl: string | undefined;
    $el.find("a[href]").each((_, a) => {
      const href = $(a).attr("href") ?? "";
      if (href.includes("amazon.com") && (href.includes("/dp/") || href.includes("/gp/product/"))) {
        productUrl = href;
      }
    });

    // Extract item name and price
    const priceMatch = text.match(/\$(\d+\.\d{2})/);
    if (!priceMatch) return;
    const price = parseFloat(priceMatch[1]);
    if (price <= 0) return;

    // Get the name - it's usually the longest text node that isn't a price
    let name = "";
    const textParts = text.split(/\$\d+\.\d{2}/)[0]?.trim() ?? "";
    if (textParts.length > 3) {
      name = textParts;
    }

    // Also try finding the name from links
    if (!name || name.length < 3) {
      $el.find("a").each((_, a) => {
        const linkText = $(a).text().trim();
        if (linkText.length > 5 && linkText.length < 200 && !linkText.match(/view|order|track|return/i)) {
          name = linkText;
        }
      });
    }

    if (!name || name.length < 3) return;

    // Extract quantity
    const qtyMatch = text.match(/(?:qty|quantity)[:\s]*(\d+)/i) ??
      text.match(/(\d+)\s*(?:of|x)\s/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    // Only add if we have image or the name looks like a product (not UI text)
    if (imageUrl || (name.length > 10 && price > 0.5)) {
      items.push({
        rawName: name.slice(0, 300),
        name: cleanItemName(name),
        description: name.length > 60 ? name.slice(0, 200) : undefined,
        imageUrl,
        quantity: qty,
        unitPrice: price / qty,
        totalPrice: price,
        category: "Shopping",
        productUrl,
      });
    }
  });

  // Strategy 2: If no items found with images, try text-based extraction
  if (items.length === 0) {
    $("tr").each((_, row) => {
      const text = $(row).text().replace(/\s+/g, " ").trim();
      const itemMatch = text.match(/(.{5,100}?)\s+\$(\d+\.\d{2})/);
      if (itemMatch && !text.match(/tax|shipping|total|subtotal|promotion|discount/i)) {
        const name = itemMatch[1].trim();
        const price = parseFloat(itemMatch[2]);
        if (name.length > 2 && price > 0) {
          // Try to find image in same row
          let imageUrl: string | undefined;
          $(row).find("img").each((_, img) => {
            const src = $(img).attr("src") ?? "";
            if (src.includes("media-amazon") || src.includes("images-amazon")) {
              imageUrl = src;
            }
          });

          items.push({
            rawName: name,
            name: cleanItemName(name),
            imageUrl,
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            category: "Shopping",
          });
        }
      }
    });
  }

  // Deduplicate items by name
  const seen = new Set<string>();
  const uniqueItems = items.filter(item => {
    const key = `${item.name}:${item.totalPrice}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Extract totals
  const bodyText = $.text();

  const totalMatch = bodyText.match(/order\s*total[:\s]*\$(\d+[\d,]*\.\d{2})/i) ??
    bodyText.match(/grand\s*total[:\s]*\$(\d+[\d,]*\.\d{2})/i) ??
    bodyText.match(/total[:\s]*\$(\d+[\d,]*\.\d{2})/i);
  if (totalMatch) total = parseFloat(totalMatch[1].replace(/,/g, ""));

  const subtotalMatch = bodyText.match(/(?:item|sub)\s*total[:\s]*\$(\d+[\d,]*\.\d{2})/i);
  if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ""));

  const taxMatch = bodyText.match(/(?:estimated\s*)?tax[:\s]*\$(\d+[\d,]*\.\d{2})/i);
  if (taxMatch) tax = parseFloat(taxMatch[1].replace(/,/g, ""));

  const shippingMatch = bodyText.match(/shipping[:\s&;]*(?:handling)?[:\s]*\$(\d+[\d,]*\.\d{2})/i);
  if (shippingMatch) shipping = parseFloat(shippingMatch[1].replace(/,/g, ""));

  const dateMatch = bodyText.match(/(?:order(?:ed)?|placed)\s*(?:on|date)?[:\s]*(\w+ \d{1,2},? \d{4})/i) ??
    bodyText.match(/(\w{3,9}\s+\d{1,2},\s+\d{4})/);
  if (dateMatch) orderDate = dateMatch[1];

  const cardMatch = bodyText.match(/ending\s*in\s*(\d{4})/i) ?? bodyText.match(/\*{3,}(\d{4})/);
  if (cardMatch) cardLast4 = cardMatch[1];

  if (total === 0 && uniqueItems.length === 0) return null;
  if (!subtotal && uniqueItems.length > 0) subtotal = uniqueItems.reduce((s, i) => s + i.totalPrice, 0);
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
    payment: { method: "card", cardLast4, walletType: null, entryMode: null },
    items: uniqueItems,
    metadata: {
      confidence: uniqueItems.length > 0 ? 0.9 : 0.7,
      requiresReview: uniqueItems.length === 0,
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
  let orderDate = "";
  let cardLast4: string | null = null;
  let inItems = false;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (/items?\s*ordered/i.test(trimmed)) { inItems = true; continue; }
    if (/^-{3,}$/.test(trimmed) || /subtotal|order total/i.test(trimmed)) { inItems = false; }

    if (inItems) {
      const priceMatch = trimmed.match(/^(.+?)\s+\$(\d+\.\d{2})\s*$/);
      if (priceMatch) {
        items.push({
          rawName: priceMatch[1].trim(),
          name: cleanItemName(priceMatch[1].trim()),
          quantity: 1,
          unitPrice: parseFloat(priceMatch[2]),
          totalPrice: parseFloat(priceMatch[2]),
          category: "Shopping",
        });
      }
    }

    const totalMatch = trimmed.match(/order\s*total[:\s]*\$(\d+[\d,]*\.\d{2})/i);
    if (totalMatch) total = parseFloat(totalMatch[1].replace(/,/g, ""));
    const subtotalMatch = trimmed.match(/(?:item|sub)\s*total[:\s]*\$(\d+[\d,]*\.\d{2})/i);
    if (subtotalMatch) subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ""));
    const taxMatch = trimmed.match(/tax[:\s]*\$(\d+[\d,]*\.\d{2})/i);
    if (taxMatch) tax = parseFloat(taxMatch[1].replace(/,/g, ""));
    const shippingMatch = trimmed.match(/shipping[:\s]*\$(\d+[\d,]*\.\d{2})/i);
    if (shippingMatch) shipping = parseFloat(shippingMatch[1].replace(/,/g, ""));
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
      subtotal, tax, tip: 0, discount: 0, fees: shipping, total,
    },
    payment: { method: "card", cardLast4, walletType: null, entryMode: null },
    items,
    metadata: { confidence: items.length > 0 ? 0.85 : 0.65, requiresReview: items.length === 0 },
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
