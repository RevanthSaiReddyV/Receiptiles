import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";

export const maxDuration = 30;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

// ---------------------------------------------------------------------------
// Card scan prompt  -- gpt-4o-mini with vision (~$0.003 per call)
// ---------------------------------------------------------------------------

const CARD_SCAN_PROMPT = `You are a credit card identification assistant. Analyze the provided image(s) of a credit card (front and/or back).

Extract the following information:

1. **last4**: The last 4 digits of the card number. Look for the full card number (front or back) and take the last 4 digits. If you can only see partial digits, extract what you can.
2. **network**: The card network. Determine from the logo or number prefix: "visa", "mastercard", "amex", "discover", or "other".
3. **cardProduct**: The specific card product name (e.g. "Chase Sapphire Reserve", "Amex Gold", "Capital One Venture X"). Look for text on the card, logos, distinctive card art/colors. If you cannot determine the exact product, set to null.
4. **issuer**: The bank/issuer name (e.g. "Chase", "American Express", "Capital One", "Citi", "Discover", "Bank of America", "Wells Fargo"). Look for bank logos and text.
5. **expMonth**: Expiration month (1-12) if visible, or null.
6. **expYear**: Expiration year (4 digits, e.g. 2027) if visible, or null.
7. **cardholderName**: Cardholder name if visible, or null.
8. **confidence**: Your confidence in the overall extraction: "high", "medium", or "low".

Return ONLY valid JSON with this structure:
{
  "last4": "1234" or "",
  "network": "visa",
  "cardProduct": "Chase Sapphire Reserve" or null,
  "issuer": "Chase" or null,
  "expMonth": 12 or null,
  "expYear": 2027 or null,
  "cardholderName": "JOHN DOE" or null,
  "confidence": "high"
}

IMPORTANT:
- Many modern cards print the number ONLY on the back. Always check both sides.
- Card art, color scheme, and design are strong identifiers even without text.
- Amex cards show the number on the front with a 4-6-5 format.
- Look for the Visa/MC/Amex/Discover logo to determine network.
- If you see "Member Since" it's likely an Amex card.
- Prioritize accuracy of last4 and cardProduct identification.`;

// ---------------------------------------------------------------------------
// Known card products -> preset IDs for auto-filling rewards
// ---------------------------------------------------------------------------

const PRODUCT_TO_PRESET: Record<string, string> = {
  "chase sapphire preferred": "chase-sapphire-preferred",
  "chase sapphire reserve": "chase-sapphire-reserve",
  "chase freedom unlimited": "chase-freedom-unlimited",
  "chase freedom flex": "chase-freedom-flex",
  "chase ink business preferred": "chase-ink-business-preferred",
  "amex gold": "amex-gold",
  "american express gold": "amex-gold",
  "amex platinum": "amex-platinum",
  "american express platinum": "amex-platinum",
  "capital one savorone": "capital-one-savor",
  "capital one savor one": "capital-one-savor",
  "capital one savor": "capital-one-savor",
  "citi double cash": "citi-double-cash",
  "discover it": "discover-it",
};

function resolvePreset(cardProduct: string | null): string {
  if (!cardProduct) return "custom";
  const normalized = cardProduct.toLowerCase().trim();
  // Exact match first
  if (PRODUCT_TO_PRESET[normalized]) return PRODUCT_TO_PRESET[normalized];
  // Partial match
  for (const [key, preset] of Object.entries(PRODUCT_TO_PRESET)) {
    if (normalized.includes(key) || key.includes(normalized)) return preset;
  }
  return "custom";
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { frontImage, backImage } = body as {
      frontImage?: string; // base64 data URL
      backImage?: string;  // base64 data URL
    };

    if (!frontImage && !backImage) {
      return NextResponse.json(
        { error: "At least one card image is required" },
        { status: 400 }
      );
    }

    // Build the image content array
    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    if (frontImage) {
      imageContent.push({
        type: "image_url",
        image_url: {
          url: frontImage.startsWith("data:")
            ? frontImage
            : `data:image/jpeg;base64,${frontImage}`,
          detail: "high",
        },
      });
      imageContent.push({
        type: "text",
        text: "This is the FRONT of the credit card.",
      });
    }

    if (backImage) {
      imageContent.push({
        type: "image_url",
        image_url: {
          url: backImage.startsWith("data:")
            ? backImage
            : `data:image/jpeg;base64,${backImage}`,
          detail: "high",
        },
      });
      imageContent.push({
        type: "text",
        text: "This is the BACK of the credit card.",
      });
    }

    if (!frontImage && backImage) {
      imageContent.push({
        type: "text",
        text: "Only the back of the card was provided. Extract what you can from it.",
      });
    }

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CARD_SCAN_PROMPT },
        { role: "user", content: imageContent },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content) as {
      last4: string;
      network: string;
      cardProduct: string | null;
      issuer: string | null;
      expMonth: number | null;
      expYear: number | null;
      cardholderName: string | null;
      confidence: "high" | "medium" | "low";
    };

    // Resolve the preset for auto-filling rewards
    const preset = resolvePreset(parsed.cardProduct);

    // Build a friendly card name
    let cardName = parsed.cardProduct;
    if (!cardName) {
      if (parsed.issuer) {
        cardName = `${parsed.issuer} ${parsed.network.charAt(0).toUpperCase() + parsed.network.slice(1)} Card`;
      } else {
        cardName = `${parsed.network.charAt(0).toUpperCase() + parsed.network.slice(1)} Card`;
      }
    }

    return NextResponse.json({
      last4: parsed.last4 || "",
      network: parsed.network || "other",
      cardProduct: parsed.cardProduct,
      cardName,
      issuer: parsed.issuer,
      preset,
      expMonth: parsed.expMonth,
      expYear: parsed.expYear,
      cardholderName: parsed.cardholderName,
      confidence: parsed.confidence,
    });
  } catch (error) {
    console.error("[Card Scan] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Card scanning failed",
      },
      { status: 500 }
    );
  }
}
