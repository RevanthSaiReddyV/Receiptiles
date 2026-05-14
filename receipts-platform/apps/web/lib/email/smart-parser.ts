import { db } from "@receipts/db";
import OpenAI from "openai";

interface ParseRules {
  totalPattern: string;
  subtotalPattern: string;
  taxPattern: string;
  itemPatterns: string[];
  datePattern: string;
  cardPattern: string;
  merchantName: string;
  category: string;
}

interface ParsedResult {
  merchant: { rawName: string; canonicalName: string; category: string; location: string | null };
  purchase: { purchasedAt: string; currency: string; subtotal: number; tax: number; tip: number; discount: number; fees: number; total: number };
  payment: { method: string; cardLast4: string | null; walletType: string | null; entryMode: string | null };
  items: Array<{ rawName: string; name: string; quantity: number; unitPrice: number; totalPrice: number; category: string }>;
  metadata: { confidence: number; requiresReview: boolean };
}

/**
 * Try to parse an email using a previously AI-generated parser for this sender domain.
 * Returns null if no parser exists or parsing fails.
 */
export async function trySmartParse(
  senderEmail: string,
  subject: string,
  bodyText: string
): Promise<ParsedResult | null> {
  const domain = senderEmail.split("@")[1];
  if (!domain) return null;

  const parser = await db.retailerParser.findUnique({
    where: { senderDomain: domain },
  });

  if (!parser) return null;

  const rules = parser.parseRules as unknown as ParseRules;

  try {
    const total = extractByPattern(bodyText, rules.totalPattern);
    if (!total || total === 0) {
      await db.retailerParser.update({
        where: { id: parser.id },
        data: { failCount: { increment: 1 } },
      });
      return null;
    }

    const subtotal = extractByPattern(bodyText, rules.subtotalPattern) ?? 0;
    const tax = extractByPattern(bodyText, rules.taxPattern) ?? 0;

    const items: ParsedResult["items"] = [];
    for (const pattern of rules.itemPatterns) {
      const regex = new RegExp(pattern, "gim");
      let match;
      while ((match = regex.exec(bodyText)) !== null) {
        const name = (match[1] ?? "").trim();
        const price = parseFloat((match[2] ?? "0").replace(/,/g, ""));
        if (name.length > 1 && price > 0) {
          items.push({
            rawName: name,
            name: name.slice(0, 80),
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            category: rules.category,
          });
        }
      }
    }

    let dateStr = new Date().toISOString();
    if (rules.datePattern) {
      const dateMatch = bodyText.match(new RegExp(rules.datePattern, "i"));
      if (dateMatch?.[1]) {
        const parsed = new Date(dateMatch[1]);
        if (!isNaN(parsed.getTime())) dateStr = parsed.toISOString();
      }
    }

    const cardMatch = rules.cardPattern ? bodyText.match(new RegExp(rules.cardPattern, "i")) : null;

    await db.retailerParser.update({
      where: { id: parser.id },
      data: { successCount: { increment: 1 }, lastUsedAt: new Date() },
    });

    return {
      merchant: {
        rawName: rules.merchantName,
        canonicalName: rules.merchantName,
        category: rules.category,
        location: null,
      },
      purchase: {
        purchasedAt: dateStr,
        currency: "USD",
        subtotal: subtotal || total - tax,
        tax,
        tip: 0,
        discount: 0,
        fees: 0,
        total,
      },
      payment: {
        method: "card",
        cardLast4: cardMatch?.[1] ?? null,
        walletType: null,
        entryMode: "online",
      },
      items,
      metadata: {
        confidence: items.length > 0 ? 0.85 : 0.7,
        requiresReview: items.length === 0,
      },
    };
  } catch {
    await db.retailerParser.update({
      where: { id: parser.id },
      data: { failCount: { increment: 1 } },
    });
    return null;
  }
}

/**
 * After AI successfully parses an email, generate parsing rules
 * for this sender domain so future emails can be parsed without AI.
 */
export async function learnParserFromEmail(
  senderEmail: string,
  subject: string,
  bodyText: string,
  aiResult: ParsedResult
): Promise<void> {
  const domain = senderEmail.split("@")[1];
  if (!domain) return;

  // Don't regenerate if we already have a good parser
  const existing = await db.retailerParser.findUnique({
    where: { senderDomain: domain },
  });
  if (existing && existing.successCount > 3 && existing.failCount === 0) return;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You generate regex patterns for parsing receipt emails. Given an email body and the extracted data, create regex patterns that would extract the same data from similar future emails.

Return JSON:
{
  "totalPattern": "regex to capture total amount as group 1 (number with decimals)",
  "subtotalPattern": "regex to capture subtotal as group 1",
  "taxPattern": "regex to capture tax as group 1",
  "itemPatterns": ["regex patterns where group 1 = item name, group 2 = price"],
  "datePattern": "regex to capture date as group 1",
  "cardPattern": "regex to capture last 4 card digits as group 1",
  "merchantName": "canonical merchant name",
  "category": "spending category"
}

Make patterns flexible enough to handle slight variations but specific enough to avoid false matches.
Use \\$ for dollar signs. Escape special regex chars. Use non-greedy quantifiers.`,
        },
        {
          role: "user",
          content: `Email from: ${senderEmail}
Subject: ${subject}

Body (first 2000 chars):
${bodyText.slice(0, 2000)}

Extracted data:
- Merchant: ${aiResult.merchant.canonicalName}
- Total: $${aiResult.purchase.total}
- Tax: $${aiResult.purchase.tax}
- Items: ${aiResult.items.map(i => `${i.name}: $${i.totalPrice}`).join(", ")}

Generate regex patterns to parse similar emails from this sender.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return;

    const rules = JSON.parse(content);

    await db.retailerParser.upsert({
      where: { senderDomain: domain },
      update: {
        parseRules: rules,
        retailerName: aiResult.merchant.canonicalName,
        category: aiResult.merchant.category,
        sampleSubject: subject,
        updatedAt: new Date(),
      },
      create: {
        senderDomain: domain,
        retailerName: aiResult.merchant.canonicalName,
        category: aiResult.merchant.category,
        parseRules: rules,
        sampleSubject: subject,
      },
    });

    console.log(`[SmartParser] Learned parser for ${domain} (${aiResult.merchant.canonicalName})`);
  } catch (err) {
    console.error(`[SmartParser] Failed to learn parser for ${domain}:`, err);
  }
}

function extractByPattern(text: string, pattern: string): number | null {
  if (!pattern) return null;
  try {
    const match = text.match(new RegExp(pattern, "i"));
    if (match?.[1]) {
      return parseFloat(match[1].replace(/,/g, ""));
    }
  } catch {
    // Invalid regex
  }
  return null;
}
