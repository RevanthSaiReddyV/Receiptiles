import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { authenticateRequest } from "@/lib/mobile-auth";
import { generateOrderFromReceipt } from "@/lib/wallet/apple-order";

/**
 * GET /api/wallet/orders/[id]
 *
 * Returns a single order in Apple Order JSON format.
 * Apple Wallet uses this to display the transaction detail view.
 *
 * Authentication:
 * - NextAuth session (web)
 * - Bearer JWT (mobile)
 * - Authorization: AppleOrder <token> (Apple Wallet)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  }

  // Resolve the receipt ID from the order identifier
  // Order IDs are formatted as "order_<receiptId>" or just the raw receipt ID
  const receiptId = orderId.startsWith("order_")
    ? orderId.slice("order_".length)
    : orderId;

  // Authenticate
  let userId = await authenticateRequest();

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

  // Verify receipt belongs to user
  const receipt = await db.receipt.findFirst({
    where: { id: receiptId, userId },
    select: { id: true, updatedAt: true },
  });

  if (!receipt) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const order = await generateOrderFromReceipt(receiptId);

    return NextResponse.json(order, {
      headers: {
        "Content-Type": "application/json",
        "Last-Modified": receipt.updatedAt.toUTCString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[Apple Order] Failed to generate order:", error);
    return NextResponse.json(
      { error: "Failed to generate order" },
      { status: 500 }
    );
  }
}
