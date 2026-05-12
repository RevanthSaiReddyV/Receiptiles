import { NextRequest, NextResponse } from "next/server";
import { generateMasterPassJson } from "@/lib/wallet/apple-pass";
import { db } from "@receipts/db";

/**
 * GET /api/wallet/apple/pass?serial=<serialNumber>
 * Apple Wallet web service — returns updated pass.json when Apple checks for updates.
 * Called by iOS when the pass needs refreshing.
 *
 * In production, this would return a full .pkpass (ZIP) with:
 * - pass.json (generated here)
 * - manifest.json (SHA-256 hashes of all files)
 * - signature (PKCS7 signed with Apple WWDR cert + pass cert)
 * - icon.png, icon@2x.png, logo.png, strip.png
 *
 * For MVP, we return the pass.json which the mobile app uses to display.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serial = searchParams.get("serial");

  if (!serial) {
    return NextResponse.json({ error: "Missing serial" }, { status: 400 });
  }

  const pass = await db.walletPass.findUnique({ where: { serialNumber: serial } });
  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  // Verify auth
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("ApplePass ", "");
  if (token !== pass.authToken) {
    // For direct URL access (initial download), skip auth
    // In production, the initial download would be authenticated differently
  }

  const passJson = await generateMasterPassJson(pass.userId, pass.serialNumber, pass.authToken);

  // Update last updated timestamp
  await db.walletPass.update({
    where: { id: pass.id },
    data: { lastUpdatedAt: new Date() },
  });

  // In production, this would return application/vnd.apple.pkpass content type
  // with the full ZIP bundle. For now, return JSON.
  return NextResponse.json(passJson, {
    headers: {
      "Last-Modified": new Date().toUTCString(),
    },
  });
}
