import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { authenticateRequest } from "@/lib/mobile-auth";
import {
  generateOrderFromReceipt,
  signOrderPackage,
} from "@/lib/wallet/apple-order";

/**
 * GET /api/wallet/orders/[id]/package
 *
 * Returns the signed Apple Order package for a specific receipt.
 * This is the file that gets added to Apple Wallet.
 *
 * Content-Type: application/vnd.apple.order
 *
 * The package is a signed ZIP containing:
 * - order.json — the order data
 * - manifest.json — SHA-256 hashes of all files
 * - signature — PKCS7 detached signature
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

  // Resolve receipt ID
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
    select: { id: true },
  });

  if (!receipt) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check if signing certs are available
  const hasCerts = !!(
    process.env.APPLE_ORDER_CERTIFICATE &&
    process.env.APPLE_ORDER_KEY &&
    process.env.APPLE_WWDR_CERTIFICATE
  );

  try {
    const order = await generateOrderFromReceipt(receiptId);

    if (!hasCerts) {
      // Return unsigned order JSON with header indicating signing status
      return NextResponse.json(order, {
        headers: {
          "Content-Type": "application/json",
          "X-Signing-Status": "unsigned-certs-missing",
          "X-Note":
            "Signing certificates not configured. Set APPLE_ORDER_CERTIFICATE, APPLE_ORDER_KEY, and APPLE_WWDR_CERTIFICATE.",
        },
      });
    }

    // Generate signed package
    const packageBuffer = signOrderPackage(order);

    return new NextResponse(new Uint8Array(packageBuffer), {
      headers: {
        "Content-Type": "application/vnd.apple.order",
        "Content-Disposition": `attachment; filename="order-${receiptId.slice(0, 8)}.order"`,
        "Last-Modified": new Date().toUTCString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[Apple Order Package] Error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to generate order package", details: message },
      { status: 500 }
    );
  }
}
