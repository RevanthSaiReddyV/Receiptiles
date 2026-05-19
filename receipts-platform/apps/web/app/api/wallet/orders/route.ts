import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { authenticateRequest } from "@/lib/mobile-auth";
import { generateOrderFromReceipt } from "@/lib/wallet/apple-order";

/**
 * GET /api/wallet/orders
 *
 * Returns all orders (receipts) for the authenticated user in Apple Order format.
 *
 * Authentication:
 * - NextAuth session (web)
 * - Bearer JWT (mobile)
 * - Authorization: AppleOrder <token> (Apple Wallet polling)
 *
 * Query params:
 * - limit (default 50, max 200)
 * - offset (default 0)
 * - since (ISO 8601 date — only orders updated after this timestamp)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const since = searchParams.get("since");

  // Try standard auth first (session or Bearer token)
  let userId = await authenticateRequest();

  // Fall back to AppleOrder token auth
  if (!userId) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("AppleOrder ")) {
      const token = authHeader.slice("AppleOrder ".length);
      const pass = await db.walletPass.findFirst({
        where: { authToken: token, platform: "apple", isActive: true },
        select: { userId: true },
      });
      if (pass) {
        userId = pass.userId;
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch receipts
  const where: Record<string, unknown> = { userId };
  if (since) {
    where.updatedAt = { gte: new Date(since) };
  }

  const receipts = await db.receipt.findMany({
    where,
    orderBy: { purchasedAt: "desc" },
    take: limit,
    skip: offset,
    select: { id: true },
  });

  // Generate order objects
  const orders = await Promise.all(
    receipts.map(async (receipt) => {
      try {
        return await generateOrderFromReceipt(receipt.id);
      } catch {
        return null;
      }
    })
  );

  const validOrders = orders.filter(Boolean);

  return NextResponse.json(
    { orders: validOrders, total: validOrders.length, offset, limit },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
