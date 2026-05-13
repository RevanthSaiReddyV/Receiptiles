import * as cheerio from "cheerio";
import type { EmailParser, ParsedEmailReceipt } from "./types";

export const genericParser: EmailParser = {
  id: "generic",

  canParse() {
    return true;
  },

  parse(html: string, plainText: string, subject: string): ParsedEmailReceipt | null {
    const $ = html ? cheerio.load(html) : null;
    const text = $ ? extractCleanText($) : plainText;
    if (!text || text.length < 20) return null;

    let total = 0;
    let subtotal = 0;
    let tax = 0;
    let tip = 0;
    let fees = 0;
    let discount = 0;
    let merchantName = "";
    let orderDate = "";
    let cardLast4: string | null = null;
    const items: ParsedEmailReceipt["items"] = [];

    // --- TOTAL extraction (try multiple strategies) ---
    total = extractLabeledAmount(text, [
      /(?:order|grand|amount)\s*total[:\s$]*\$?([\d,]+\.\d{2})/i,
      /total\s*(?:charged|paid|due|amount)?[:\s$]*\$?([\d,]+\.\d{2})/i,
      /(?:you\s*(?:paid|were charged)|amount\s*charged|charged?)[:\s$]*\$?([\d,]+\.\d{2})/i,
      /(?:transaction|payment)\s*(?:amount|total)?[:\s$]*\$?([\d,]+\.\d{2})/i,
    ]);

    if ($ && total === 0) {
      total = extractFromHtmlTable($, /total/i);
    }

    // Last resort: largest price in the email
    if (total === 0) {
      const allPrices: number[] = [];
      const priceRe = /\$([\d,]+\.\d{2})/g;
      let m;
      while ((m = priceRe.exec(text)) !== null) {
        allPrices.push(parseFloat(m[1].replace(/,/g, "")));
      }
      if (allPrices.length > 0) total = Math.max(...allPrices);
    }

    subtotal = extractLabeledAmount(text, [
      /sub\s*-?\s*total[:\s$]*\$?([\d,]+\.\d{2})/i,
      /item\s*(?:sub)?total[:\s$]*\$?([\d,]+\.\d{2})/i,
    ]);

    tax = extractLabeledAmount(text, [
      /(?:estimated\s*)?(?:sales\s*)?tax(?:es)?[:\s$]*\$?([\d,]+\.\d{2})/i,
    ]);

    tip = extractLabeledAmount(text, [
      /(?:tip|gratuity)[:\s$]*\$?([\d,]+\.\d{2})/i,
    ]);

    fees = extractLabeledAmount(text, [
      /(?:service|delivery|booking|processing)\s*fee[:\s$]*\$?([\d,]+\.\d{2})/i,
      /shipping(?:\s*&?\s*handling)?[:\s$]*\$?([\d,]+\.\d{2})/i,
    ]);

    discount = extractLabeledAmount(text, [
      /(?:discount|savings|promo|coupon)[:\s$]*-?\$?([\d,]+\.\d{2})/i,
    ]);

    // --- Date extraction ---
    const datePatterns = [
      /(?:date|ordered|placed|purchased|billed)[:\s]*(\w{3,9}\.?\s+\d{1,2},?\s+\d{4})/i,
      /(?:date|ordered|placed|purchased|billed)[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(\w{3,9}\s+\d{1,2},\s+\d{4})/,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
    ];
    for (const pat of datePatterns) {
      const dm = text.match(pat);
      if (dm) {
        const parsed = new Date(dm[1]);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) {
          orderDate = parsed.toISOString();
          break;
        }
      }
    }

    // --- Card extraction ---
    const cardMatch = text.match(/(?:ending\s*(?:in|with)|last\s*4|card)[:\s]*[.*x*]*(\d{4})/i) ??
      text.match(/\*{2,}(\d{4})/) ??
      text.match(/x{2,}(\d{4})/i);
    if (cardMatch) cardLast4 = cardMatch[1];

    // --- Merchant name ---
    merchantName = extractMerchantFromSubject(subject);

    // --- Items ---
    if ($) extractItemsFromHtml($, items, total);
    if (items.length === 0) extractItemsFromText(text, items, total);

    if (total === 0) return null;
    if (!subtotal) subtotal = Math.max(0, total - tax - tip - fees + discount);

    return {
      merchant: {
        rawName: merchantName || "Unknown",
        canonicalName: merchantName || "Unknown",
        category: "Uncategorized",
        location: null,
      },
      purchase: {
        purchasedAt: orderDate || new Date().toISOString(),
        currency: "USD",
        subtotal,
        tax,
        tip,
        discount,
        fees,
        total,
      },
      payment: { method: cardLast4 ? "card" : "unknown", cardLast4, walletType: null, entryMode: null },
      items,
      metadata: {
        confidence: items.length > 0 ? 0.65 : 0.45,
        requiresReview: true,
      },
    };
  },
};

function extractLabeledAmount(text: string, patterns: RegExp[]): number {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return parseFloat(m[1].replace(/,/g, ""));
  }
  return 0;
}

function extractFromHtmlTable($: cheerio.CheerioAPI, labelPattern: RegExp): number {
  let found = 0;
  $("tr").each((_, row) => {
    if (found) return;
    const cells = $(row).find("td, th");
    cells.each((i, cell) => {
      const cellText = $(cell).text().trim();
      if (labelPattern.test(cellText) && cellText.length < 30) {
        const nextCell = cells.eq(i + 1);
        const priceText = nextCell.length ? nextCell.text() : $(row).text();
        const priceMatch = priceText.match(/\$?([\d,]+\.\d{2})/);
        if (priceMatch) found = parseFloat(priceMatch[1].replace(/,/g, ""));
      }
    });
  });
  return found;
}

function extractCleanText($: cheerio.CheerioAPI): string {
  $("style, script, head, title").remove();
  return $("body").text().replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n");
}

function extractMerchantFromSubject(subject: string): string {
  let m = subject.match(/(?:receipt|order|invoice)\s+(?:from|at|for)\s+(.+?)(?:\.|!|$)/i);
  if (m) return m[1].trim();

  m = subject.match(/(?:your\s+)?(.+?)\s+(?:receipt|order|invoice|confirmation)/i);
  if (m && m[1].length < 40 && m[1].length > 1) {
    const cleaned = m[1].replace(/^(your|the)\s+/i, "").trim();
    if (cleaned.length > 1) return cleaned;
  }

  return "";
}

const SKIP = /^(tax|total|subtotal|shipping|fee|tip|discount|promo|savings|handling|delivery|service|estimated)/i;

function extractItemsFromHtml($: cheerio.CheerioAPI, items: ParsedEmailReceipt["items"], total: number) {
  $("tr").each((_, row) => {
    const rowText = $(row).text().replace(/\s+/g, " ").trim();
    if (rowText.length < 5 || rowText.length > 300) return;
    if (SKIP.test(rowText.trim())) return;

    const qtyMatch = rowText.match(/(\d+)\s*[x×]\s*(.+?)\s+\$?([\d,]+\.\d{2})/);
    if (qtyMatch) {
      const name = qtyMatch[2].trim();
      const price = parseFloat(qtyMatch[3].replace(/,/g, ""));
      const qty = parseInt(qtyMatch[1]);
      if (name.length > 1 && price > 0 && price <= (total || 99999) * 1.1) {
        items.push({ rawName: name, name, quantity: qty, unitPrice: price / qty, totalPrice: price, category: "Uncategorized" });
      }
      return;
    }

    const simpleMatch = rowText.match(/^(.+?)\s+\$?([\d,]+\.\d{2})\s*$/);
    if (simpleMatch) {
      const name = simpleMatch[1].trim();
      const price = parseFloat(simpleMatch[2].replace(/,/g, ""));
      if (name.length > 2 && name.length < 150 && price > 0 && price <= (total || 99999) * 1.1 && !SKIP.test(name)) {
        items.push({ rawName: name, name, quantity: 1, unitPrice: price, totalPrice: price, category: "Uncategorized" });
      }
    }
  });
}

function extractItemsFromText(text: string, items: ParsedEmailReceipt["items"], total: number) {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 200 || SKIP.test(trimmed)) continue;

    const qtyMatch = trimmed.match(/(\d+)\s*[x×]\s*(.+?)\s+\$?([\d,]+\.\d{2})/);
    if (qtyMatch) {
      const name = qtyMatch[2].trim();
      const price = parseFloat(qtyMatch[3].replace(/,/g, ""));
      const qty = parseInt(qtyMatch[1]);
      if (name.length > 1 && price > 0 && price <= (total || 99999) * 1.1) {
        items.push({ rawName: name, name, quantity: qty, unitPrice: price / qty, totalPrice: price, category: "Uncategorized" });
      }
      continue;
    }

    const simpleMatch = trimmed.match(/^(.+?)\s+\$?([\d,]+\.\d{2})\s*$/);
    if (simpleMatch) {
      const name = simpleMatch[1].trim();
      const price = parseFloat(simpleMatch[2].replace(/,/g, ""));
      if (name.length > 2 && name.length < 150 && price > 0 && price <= (total || 99999) * 1.1 && !SKIP.test(name)) {
        items.push({ rawName: name, name, quantity: 1, unitPrice: price, totalPrice: price, category: "Uncategorized" });
      }
    }
  }
}
