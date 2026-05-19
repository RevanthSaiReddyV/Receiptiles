import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { generateReceiptPassJson } from "@/lib/wallet/apple-receipt-pass";

/**
 * GET /api/wallet/receipt/[id]/apple
 *
 * Returns the Apple Wallet pass JSON for a specific receipt.
 * Auth: requires session (web) or Bearer token (mobile).
 *
 * In production with signing certs, this would return a .pkpass file.
 * For now, returns the pass.json content that can be used to generate
 * the signed bundle once certificates are configured.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: receiptId } = await params;

  if (!receiptId) {
    return NextResponse.json(
      { error: "Missing receipt ID" },
      { status: 400 }
    );
  }

  try {
    const passJson = await generateReceiptPassJson(receiptId, userId);

    // Check if signing certificates are available
    const hasCerts = !!(
      process.env.APPLE_PASS_CERTIFICATE &&
      process.env.APPLE_PASS_KEY &&
      process.env.APPLE_WWDR_CERTIFICATE
    );

    return NextResponse.json(passJson, {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass+json",
        "Last-Modified": new Date().toUTCString(),
        "X-Signing-Status": hasCerts
          ? "certificates-available-awaiting-passkit-generator"
          : "unsigned",
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Receipt not found"
    ) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate pass" },
      { status: 500 }
    );
  }
}
