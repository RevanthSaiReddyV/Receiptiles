import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import {
  getOrCreateWalletPass,
  generateMasterPassJson,
} from "@/lib/wallet/apple-pass";
import { db } from "@receipts/db";

/**
 * GET /api/wallet/apple
 * Get the user's Apple Wallet master pass data.
 * Returns the pass JSON and download URL for the .pkpass file.
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pass = await getOrCreateWalletPass(userId);
  const passJson = await generateMasterPassJson(
    userId,
    pass.serialNumber,
    pass.authToken
  );

  return NextResponse.json({
    pass: passJson,
    serialNumber: pass.serialNumber,
    downloadUrl: `https://receiptiles.com/api/wallet/apple/pass?serial=${pass.serialNumber}`,
  });
}

/**
 * POST /api/wallet/apple
 * Apple Wallet webServiceURL endpoint — called when pass is registered on device.
 * Apple sends: POST with pushToken and serialNumber when the pass is added to a device.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pushToken, serialNumber } = body;

  if (!serialNumber) {
    return NextResponse.json(
      { error: "Missing serialNumber" },
      { status: 400 }
    );
  }

  // Look up the pass
  const pass = await db.walletPass.findUnique({ where: { serialNumber } });
  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  // Verify auth token (Apple sends "ApplePass <token>")
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("ApplePass ", "");
  if (token !== pass.authToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Store push token for future APNs update notifications
  await db.walletPass.update({
    where: { id: pass.id },
    data: { pushToken: pushToken ?? null },
  });

  return NextResponse.json({ registered: true }, { status: 201 });
}

/**
 * DELETE /api/wallet/apple
 * Called when a pass is removed from a device.
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serialNumber = searchParams.get("serial");

  if (!serialNumber) {
    return NextResponse.json(
      { error: "Missing serial" },
      { status: 400 }
    );
  }

  const pass = await db.walletPass.findUnique({ where: { serialNumber } });
  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("ApplePass ", "");
  if (token !== pass.authToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Clear push token (pass removed from device, but keep record)
  await db.walletPass.update({
    where: { id: pass.id },
    data: { pushToken: null },
  });

  return new NextResponse(null, { status: 200 });
}
