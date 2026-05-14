import OpenAI from "openai";
import { canonicalReceiptSchema } from "@receipts/shared";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

const RECEIPT_PARSE_PROMPT = `You are an expert receipt and order confirmation parser. Extract ALL structured data from receipts, order confirmations, invoices, and purchase emails.

IMPORTANT RULES:
1. If the text is NOT a receipt/order/invoice (marketing, shipping update, review request), return {"not_a_receipt": true}
2. Extract EVERY item listed — do not skip any
3. For each item, extract the exact name, quantity, and price
4. The "From:" line tells you the merchant
5. Never use null for string fields — use "Unknown" instead
6. For dates, look for "Order placed", "Date", "Purchased" etc. If not found, use today's date.

Return JSON:
{
  "merchant": {
    "rawName": "exact merchant name from email",
    "canonicalName": "normalized name (e.g., 'Amazon.com' -> 'Amazon')",
    "category": "Groceries|Dining|Shopping|Transportation|Travel|Entertainment|Healthcare|Utilities|Subscriptions|Gas & Fuel|Electronics|Home & Garden|Personal Care|Education|Uncategorized",
    "location": "store location or null"
  },
  "purchase": {
    "purchasedAt": "ISO 8601 datetime",
    "currency": "USD",
    "subtotal": number,
    "tax": number,
    "tip": 0,
    "discount": 0,
    "fees": number (shipping/delivery fees),
    "total": number (the final amount charged)
  },
  "payment": {
    "method": "card/cash/online/unknown",
    "cardId": null,
    "cardLast4": "last 4 digits if shown, or null",
    "walletType": null,
    "entryMode": "online"
  },
  "items": [
    {
      "rawName": "full original item name/description",
      "name": "short clean name (max 80 chars)",
      "quantity": number (default 1),
      "unitPrice": number,
      "totalPrice": number (quantity * unitPrice),
      "category": "item category"
    }
  ],
  "metadata": {
    "confidence": 0.0 to 1.0,
    "requiresReview": false
  }
}

Extract ALL items. If an item has variants/options (size, color), include them in rawName.
For Amazon: extract each product as a separate item.
For subscriptions: the service name is the item.
Always return valid JSON.`;

function sanitizeAIOutput(parsed: Record<string, unknown>): Record<string, unknown> {
  const m = parsed.merchant as Record<string, unknown> | undefined;
  if (m) {
    m.rawName = m.rawName ?? "Unknown";
    m.canonicalName = m.canonicalName ?? m.rawName ?? "Unknown";
    m.category = m.category ?? "Uncategorized";
    m.location = m.location ?? null;
  }
  const p = parsed.payment as Record<string, unknown> | undefined;
  if (p) {
    p.method = p.method ?? "unknown";
    p.cardId = p.cardId ?? null;
    p.cardLast4 = p.cardLast4 ?? null;
    p.walletType = p.walletType ?? null;
    p.entryMode = p.entryMode ?? null;
  }
  const meta = parsed.metadata as Record<string, unknown> | undefined;
  if (meta) {
    meta.confidence = meta.confidence ?? 0.5;
    meta.requiresReview = meta.requiresReview ?? true;
  }
  if (!parsed.items) parsed.items = [];
  return parsed;
}

export async function parseReceiptFromImage(imageBase64: string) {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: RECEIPT_PARSE_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
          { type: "text", text: "Parse this receipt image." },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from GPT-4o");

  const parsed = JSON.parse(content);
  if (parsed.not_a_receipt) throw new Error("Not a receipt");
  return canonicalReceiptSchema.omit({ source: true }).parse(sanitizeAIOutput(parsed));
}

export async function parseReceiptFromText(ocrText: string) {
  const truncated = ocrText.slice(0, 6000);
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RECEIPT_PARSE_PROMPT },
      {
        role: "user",
        content: `Parse this receipt/order email. Extract ALL items with names, quantities, and prices:\n\n${truncated}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from GPT-4o-mini");

  const parsed = JSON.parse(content);
  if (parsed.not_a_receipt) throw new Error("Not a receipt");
  return canonicalReceiptSchema.omit({ source: true }).parse(sanitizeAIOutput(parsed));
}
