import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import {
  getOrCreateGoogleWalletPass,
  generateGooglePassObject,
  generateSaveLink,
} from "@/lib/wallet/google-pass";

/**
 * GET /api/wallet/google
 * Get Google Wallet pass data + save link.
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pass = await getOrCreateGoogleWalletPass(userId);
  const passObject = await generateGooglePassObject(userId, pass.serialNumber);
  const saveLink = generateSaveLink(passObject);

  return NextResponse.json({
    passObject,
    serialNumber: pass.serialNumber,
    saveLink,
  });
}
