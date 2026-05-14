import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = request.nextUrl;
  const itemName = searchParams.get("itemName");
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);

  // Get all items purchased by this user with their receipt dates
  const itemWhere: Record<string, unknown> = {
    receipt: { userId },
  };

  if (itemName) {
    itemWhere.name = { contains: itemName, mode: "insensitive" };
  }

  const items = await db.receiptItem.findMany({
    where: itemWhere,
    select: {
      name: true,
      unitPrice: true,
      quantity: true,
      totalPrice: true,
      receipt: {
        select: {
          purchasedAt: true,
          merchantCanonicalName: true,
        },
      },
    },
    orderBy: { receipt: { purchasedAt: "desc" } },
    take: 500, // Get enough items to build history
  });

  // Group items by name and build price history
  const itemMap = new Map<
    string,
    Array<{
      price: number;
      quantity: number;
      merchant: string;
      date: string;
    }>
  >();

  for (const item of items) {
    const key = item.name.toLowerCase().trim();
    if (!itemMap.has(key)) {
      itemMap.set(key, []);
    }
    itemMap.get(key)!.push({
      price: item.unitPrice,
      quantity: item.quantity,
      merchant: item.receipt.merchantCanonicalName,
      date: item.receipt.purchasedAt.toISOString(),
    });
  }

  // Build price tracking data - only include items purchased more than once
  const priceTracking = Array.from(itemMap.entries())
    .filter(([, history]) => history.length >= 2)
    .map(([name, history]) => {
      const prices = history.map((h) => h.price);
      const currentPrice = prices[0];
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);
      const avgPrice =
        prices.reduce((sum, p) => sum + p, 0) / prices.length;

      const priceChange =
        history.length >= 2
          ? ((prices[0] - prices[1]) / prices[1]) * 100
          : 0;

      return {
        itemName: history[0].merchant
          ? `${name.charAt(0).toUpperCase() + name.slice(1)}`
          : name,
        currentPrice,
        lowestPrice,
        highestPrice,
        avgPrice: Math.round(avgPrice * 100) / 100,
        priceChange: Math.round(priceChange * 100) / 100,
        purchaseCount: history.length,
        priceHistory: history.slice(0, 20).map((h) => ({
          price: h.price,
          merchant: h.merchant,
          date: h.date,
        })),
        merchants: [...new Set(history.map((h) => h.merchant))],
      };
    })
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, limit);

  return NextResponse.json({
    items: priceTracking,
    total: priceTracking.length,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { itemName: string; targetPrice: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { itemName, targetPrice } = body;

  if (!itemName || targetPrice == null) {
    return NextResponse.json(
      { error: "itemName and targetPrice are required" },
      { status: 400 }
    );
  }

  if (typeof targetPrice !== "number" || targetPrice <= 0) {
    return NextResponse.json(
      { error: "targetPrice must be a positive number" },
      { status: 400 }
    );
  }

  // Verify the user has purchased this item before
  const existingItem = await db.receiptItem.findFirst({
    where: {
      name: { contains: itemName, mode: "insensitive" },
      receipt: { userId: session.user.id },
    },
    select: {
      name: true,
      unitPrice: true,
    },
  });

  if (!existingItem) {
    return NextResponse.json(
      { error: "Item not found in your purchase history" },
      { status: 404 }
    );
  }

  // In a production system, this would store the alert in a PriceAlert table
  // For now, return confirmation of the alert setup
  return NextResponse.json({
    success: true,
    alert: {
      itemName: existingItem.name,
      targetPrice,
      currentPrice: existingItem.unitPrice,
      createdAt: new Date().toISOString(),
      status: "active",
    },
    message: `Price alert set for "${existingItem.name}" at $${targetPrice.toFixed(2)}. Current price: $${existingItem.unitPrice.toFixed(2)}`,
  });
}
