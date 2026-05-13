import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import OpenAI from "openai";

export const maxDuration = 30;

const SCAN_PROMPT = `You are a credit card reader. Extract card details from this image.

Return a JSON object with ONLY these fields:
{
  "cardholderName": "name on card or null",
  "last4": "last 4 digits of card number",
  "network": "visa or mastercard or amex or discover or other",
  "expMonth": number (1-12) or null,
  "expYear": number (4 digit year) or null,
  "issuer": "bank name if visible (Chase, Amex, Capital One, etc.) or null",
  "cardName": "product name if visible (Sapphire Reserve, Gold Card, etc.) or null",
  "dominantColor": "hex color of the card background"
}

IMPORTANT SECURITY RULES:
- NEVER return the full card number. Only return the last 4 digits.
- If you can see the full number, extract ONLY the last 4 digits.
- Do not return CVV/CVC.
- Detect the network from the card number prefix or logo:
  - Starts with 4: Visa
  - Starts with 5 or 2: Mastercard
  - Starts with 3: Amex
  - Starts with 6: Discover

Always return valid JSON.`;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OCR not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("image") as File;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Must be an image" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SCAN_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}` } },
            { type: "text", text: "Read this credit card. Return only the last 4 digits, never the full number." },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "Could not read card" }, { status: 422 });
    }

    const parsed = JSON.parse(content);

    // Security: ensure we NEVER return more than 4 digits
    let last4 = String(parsed.last4 ?? "").replace(/\D/g, "");
    if (last4.length > 4) last4 = last4.slice(-4);

    // Sanitize network
    const validNetworks = ["visa", "mastercard", "amex", "discover", "other"];
    const network = validNetworks.includes(parsed.network?.toLowerCase())
      ? parsed.network.toLowerCase()
      : "other";

    // Sanitize expiration
    const expMonth = parsed.expMonth && parsed.expMonth >= 1 && parsed.expMonth <= 12
      ? parsed.expMonth : null;
    const expYear = parsed.expYear && parsed.expYear >= 2024 && parsed.expYear <= 2040
      ? parsed.expYear : null;

    return NextResponse.json({
      last4,
      network,
      expMonth,
      expYear,
      issuer: parsed.issuer ?? null,
      cardName: parsed.cardName ?? null,
      cardholderName: parsed.cardholderName ?? null,
      dominantColor: parsed.dominantColor ?? null,
    });
  } catch (error) {
    console.error("[Card Scan] Error:", error);
    return NextResponse.json(
      { error: "Failed to scan card" },
      { status: 500 }
    );
  }
}
