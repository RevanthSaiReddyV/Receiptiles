import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import crypto from "crypto";

/**
 * POST /api/device/nfc-handover
 * Called when NFC tap is detected. Creates a short-lived claim token
 * that the mobile app uses to claim the receipt.
 *
 * Auth: Bearer dk_<key>
 * Body: { receiptId?, transactionId?, walletPassSerial? }
 *
 * Returns: { claimUrl, claimToken, expiresAt }
 */
export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { receiptId, transactionId, walletPassSerial } = body;

  // Generate a short-lived claim token (5 min expiry)
  const claimToken = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // Store the claim in metadata on the webhook event
  await db.webhookEvent.create({
    data: {
      provider: "device",
      eventType: "nfc.handover",
      externalId: claimToken,
      deviceId: device.id,
      payload: {
        receiptId,
        transactionId,
        walletPassSerial,
        claimToken,
        expiresAt: expiresAt.toISOString(),
        claimed: false,
      },
      status: "pending",
    },
  });

  // Build the Universal Link / App Link URL
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://receipts.app";
  const claimUrl = `${baseUrl}/claim/${claimToken}`;

  return NextResponse.json({
    claimUrl,
    claimToken,
    expiresAt: expiresAt.toISOString(),
    // NDEF record for the NFC module to broadcast
    ndefPayload: {
      type: "url",
      url: claimUrl,
    },
  });
}

/**
 * GET /api/device/nfc-handover?token=<claim_token>
 * Mobile app calls this to claim a receipt via NFC token.
 * Links the receipt to the authenticated user.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const claimToken = searchParams.get("token");

  if (!claimToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Find the claim event
  const event = await db.webhookEvent.findFirst({
    where: {
      provider: "device",
      eventType: "nfc.handover",
      externalId: claimToken,
      status: "pending",
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  const payload = event.payload as { expiresAt: string; receiptId?: string; claimed: boolean };

  // Check expiry
  if (new Date(payload.expiresAt) < new Date()) {
    await db.webhookEvent.update({
      where: { id: event.id },
      data: { status: "failed", error: "Token expired" },
    });
    return NextResponse.json({ error: "Token expired" }, { status: 410 });
  }

  if (payload.claimed) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  return NextResponse.json({
    valid: true,
    receiptId: payload.receiptId,
    claimToken,
  });
}

async function authenticateDevice(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer dk_")) return null;

  const apiKey = authHeader.slice(7);
  const device = await db.device.findUnique({ where: { apiKey } });
  return device;
}
