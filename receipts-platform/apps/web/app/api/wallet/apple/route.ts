import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { getOrCreateWalletPass, generateMasterPassJson } from "@/lib/wallet/apple-pass";
import { db } from "@receipts/db";

/**
 * GET /api/wallet/apple
 * Get the user's Apple Wallet pass data (for generating .pkpass file).
 * In production, this would serve the actual .pkpass bundle (ZIP with pass.json + signatures).
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pass = await getOrCreateWalletPass(userId);
  const passJson = await generateMasterPassJson(userId, pass.serialNumber, pass.authToken);

  return NextResponse.json({
    pass: passJson,
    serialNumber: pass.serialNumber,
    // In production: return the .pkpass URL for download
    downloadUrl: `${process.env.NEXTAUTH_URL}/api/wallet/apple/download?serial=${pass.serialNumber}`,
  });
}

/**
 * POST /api/wallet/apple
 * Apple Wallet webServiceURL endpoint — called when pass is registered on device.
 * Apple sends: POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
 * We flatten this to a simpler endpoint.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { pushToken, serialNumber } = body;

  if (!serialNumber) {
    return NextResponse.json({ error: "Missing serialNumber" }, { status: 400 });
  }

  // Update the pass with the push token for future updates
  const pass = await db.walletPass.findUnique({ where: { serialNumber } });
  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  // Verify auth token
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("ApplePass ", "");
  if (token !== pass.authToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.walletPass.update({
    where: { id: pass.id },
    data: { pushToken: pushToken ?? null },
  });

  return NextResponse.json({ registered: true }, { status: 201 });
}
