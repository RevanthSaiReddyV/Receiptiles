import { NextResponse } from "next/server";
import { parseReceiptFromText } from "@/lib/ai-parser";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const parsed = await parseReceiptFromText(text);

    return NextResponse.json({
      merchant: parsed.merchant.canonicalName,
      total: `$${parsed.purchase.total.toFixed(2)}`,
      date: new Date(parsed.purchase.purchasedAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      items: parsed.items.map((item) => ({
        name: item.name,
        price: `$${item.totalPrice.toFixed(2)}`,
        category: item.category,
      })),
      insight: `You spent $${parsed.purchase.total.toFixed(2)} at ${parsed.merchant.canonicalName}. ${
        parsed.items.length > 2
          ? `That's ${parsed.items.length} items — your most expensive was ${parsed.items.sort((a, b) => b.totalPrice - a.totalPrice)[0]?.name}.`
          : "Quick purchase — in and out!"
      }`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Parse failed" },
      { status: 500 }
    );
  }
}
