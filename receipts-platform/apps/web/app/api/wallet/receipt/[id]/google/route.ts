import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { generateGoogleReceiptLinkForId } from "@/lib/wallet/google-receipt-pass";

/**
 * GET /api/wallet/receipt/[id]/google
 *
 * Redirects to the Google Wallet "Save to Wallet" link for a specific receipt.
 * Auth: requires session (web) or Bearer token (mobile).
 *
 * The generated link uses a JWT (signed if Google Wallet service account is configured,
 * unsigned base64url otherwise) that encodes the receipt as a Generic Pass object.
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
    const saveLink = await generateGoogleReceiptLinkForId(receiptId, userId);

    // Redirect to Google Wallet save link
    return NextResponse.redirect(saveLink);
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
      { error: "Failed to generate Google Wallet link" },
      { status: 500 }
    );
  }
}
