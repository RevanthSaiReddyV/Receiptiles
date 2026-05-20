import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { canonicalReceiptSchema } from "@receipts/shared";

// --- Fine-tuned models (self-hosted, 30x cheaper + 3x faster) ---

const RECEIPT_ML_URL = process.env.RECEIPT_ML_URL; // e.g. http://localhost:8000 or https://api.receiptile.com/ml

async function fineTunedParseText(receiptText: string) {
  if (!RECEIPT_ML_URL) throw new Error("RECEIPT_ML_URL not configured");

  const response = await fetch(`${RECEIPT_ML_URL}/parse/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: receiptText.slice(0, 4000), temperature: 0.1 }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Receipt ML text parser error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const parsed = data.result;

  if (parsed.not_a_receipt) throw new Error("Not a receipt");
  return canonicalReceiptSchema.omit({ source: true }).parse(sanitizeAIOutput(parsed));
}

async function fineTunedParseImage(imageBase64: string) {
  if (!RECEIPT_ML_URL) throw new Error("RECEIPT_ML_URL not configured");

  const response = await fetch(`${RECEIPT_ML_URL}/parse/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_base64: imageBase64, temperature: 0.1 }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Receipt ML vision parser error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const parsed = data.result;

  if (parsed.not_a_receipt) throw new Error("Not a receipt");
  return canonicalReceiptSchema.omit({ source: true }).parse(sanitizeAIOutput(parsed));
}

// --- Gemini / OpenAI (fallback tiers) ---

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
Always return valid JSON only — no markdown, no code fences.`;

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

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenerativeAI(key);
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

function extractJSON(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : text.trim();
  return JSON.parse(raw);
}

// --- Gemini (primary) ---

async function geminiParseImage(imageBase64: string) {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    { text: RECEIPT_PARSE_PROMPT + "\n\nParse this receipt image." },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64,
      },
    },
  ]);

  const text = result.response.text();
  const parsed = extractJSON(text);
  if (parsed.not_a_receipt) throw new Error("Not a receipt");
  return canonicalReceiptSchema.omit({ source: true }).parse(sanitizeAIOutput(parsed));
}

async function geminiParseText(receiptText: string) {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      text: `${RECEIPT_PARSE_PROMPT}\n\nParse this receipt/order email. Extract ALL items with names, quantities, and prices:\n\n${receiptText.slice(0, 8000)}`,
    },
  ]);

  const text = result.response.text();
  const parsed = extractJSON(text);
  if (parsed.not_a_receipt) throw new Error("Not a receipt");
  return canonicalReceiptSchema.omit({ source: true }).parse(sanitizeAIOutput(parsed));
}

// --- OpenAI (fallback) ---

async function openaiParseImage(imageBase64: string) {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RECEIPT_PARSE_PROMPT },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          { type: "text", text: "Parse this receipt image." },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from GPT-4o-mini");
  const parsed = JSON.parse(content);
  if (parsed.not_a_receipt) throw new Error("Not a receipt");
  return canonicalReceiptSchema.omit({ source: true }).parse(sanitizeAIOutput(parsed));
}

async function openaiParseText(receiptText: string) {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RECEIPT_PARSE_PROMPT },
      {
        role: "user",
        content: `Parse this receipt/order email. Extract ALL items:\n\n${receiptText.slice(0, 6000)}`,
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

// --- Public API: Fine-tuned → Gemini → OpenAI (3-tier fallback) ---

export async function parseReceiptFromImage(imageBase64: string) {
  // Tier 1: Fine-tuned Qwen2.5-VL (beats GPT-4o-mini on OCR, 10x cheaper)
  if (RECEIPT_ML_URL) {
    try {
      return await fineTunedParseImage(imageBase64);
    } catch (e) {
      console.warn("[ai-parser] Fine-tuned vision model failed, falling back to Gemini:", (e as Error).message);
    }
  }
  // Tier 2: Gemini Flash
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiParseImage(imageBase64);
    } catch (e) {
      console.warn("[ai-parser] Gemini image parse failed, falling back to OpenAI:", (e as Error).message);
    }
  }
  // Tier 3: OpenAI (most expensive)
  return openaiParseImage(imageBase64);
}

export async function parseReceiptFromText(ocrText: string) {
  // Tier 1: Fine-tuned model (30x cheaper, 3x faster, higher accuracy on receipts)
  if (RECEIPT_ML_URL) {
    try {
      return await fineTunedParseText(ocrText);
    } catch (e) {
      console.warn("[ai-parser] Fine-tuned model failed, falling back to Gemini:", (e as Error).message);
    }
  }
  // Tier 2: Gemini Flash
  if (process.env.GEMINI_API_KEY) {
    try {
      return await geminiParseText(ocrText);
    } catch (e) {
      console.warn("[ai-parser] Gemini text parse failed, falling back to OpenAI:", (e as Error).message);
    }
  }
  // Tier 3: OpenAI (most expensive, last resort)
  return openaiParseText(ocrText);
}
