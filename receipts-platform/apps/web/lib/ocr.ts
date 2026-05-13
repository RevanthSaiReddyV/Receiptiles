import OpenAI from "openai";
import { canonicalReceiptSchema } from "@receipts/shared";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

const RECEIPT_PARSE_PROMPT = `You are a receipt parser. Extract structured data from the receipt image or text.

Return a JSON object with this exact structure:
{
  "merchant": {
    "rawName": "exact name as shown on receipt",
    "canonicalName": "cleaned/normalized merchant name",
    "category": "one of: Groceries, Dining, Shopping, Transportation, Travel, Entertainment, Healthcare, Utilities, Subscriptions, Gas & Fuel, Home & Garden, Personal Care, Education, Gifts & Donations, Business, Uncategorized",
    "location": "store location if visible, or null"
  },
  "purchase": {
    "purchasedAt": "ISO 8601 datetime",
    "currency": "USD",
    "subtotal": number,
    "tax": number,
    "tip": number or 0,
    "discount": number or 0,
    "fees": number or 0,
    "total": number
  },
  "payment": {
    "method": "card/cash/unknown",
    "cardId": null,
    "cardLast4": "last 4 digits if visible, or null",
    "walletType": "apple_pay/google_pay/null",
    "entryMode": "chip/swipe/tap/online/null"
  },
  "items": [
    {
      "rawName": "exact item name from receipt",
      "name": "cleaned item name",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "category": "category"
    }
  ],
  "metadata": {
    "confidence": 0.0 to 1.0 (your confidence in the extraction),
    "requiresReview": true if confidence < 0.7
  }
}

If you can't determine a value, use reasonable defaults. For dates you can't parse, use the current date.
Always return valid JSON.`;

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
  return canonicalReceiptSchema.parse(parsed);
}

export async function parseReceiptFromText(ocrText: string) {
  const truncated = ocrText.slice(0, 3000);
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: RECEIPT_PARSE_PROMPT },
      {
        role: "user",
        content: `Parse this receipt text:\n\n${truncated}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from GPT-4o");

  const parsed = JSON.parse(content);
  return canonicalReceiptSchema.parse(parsed);
}
