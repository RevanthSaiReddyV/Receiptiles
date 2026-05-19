import { NextRequest, NextResponse } from "next/server";
import { generateMasterPassJson } from "@/lib/wallet/apple-pass";
import { db } from "@receipts/db";

/**
 * GET /api/wallet/apple/pass?serial=<serialNumber>
 *
 * Apple Wallet web service — returns the pass data for download or refresh.
 *
 * In production with signing certificates, this would return a full .pkpass
 * bundle (a ZIP file containing):
 * - pass.json (the pass data generated here)
 * - manifest.json (SHA-256 hashes of all files in the bundle)
 * - signature (PKCS7 signed manifest using Apple WWDR cert + pass type cert)
 * - icon.png, icon@2x.png, icon@3x.png
 * - logo.png, logo@2x.png
 *
 * Required env vars for signing:
 * - APPLE_PASS_CERTIFICATE: base64 encoded .p12 pass type certificate
 * - APPLE_PASS_KEY: base64 encoded private key PEM
 * - APPLE_PASS_CERT_PASSWORD: password for the .p12 certificate
 * - APPLE_WWDR_CERTIFICATE: base64 encoded Apple WWDR intermediate cert
 *
 * When certs ARE available, the code is structured to use the passkit-generator
 * pattern. The signing logic lives in a separate function that can be swapped
 * in once the dependency and certificates are configured.
 *
 * For now, returns the pass.json content with appropriate headers.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serial = searchParams.get("serial");

  if (!serial) {
    return NextResponse.json({ error: "Missing serial" }, { status: 400 });
  }

  const pass = await db.walletPass.findUnique({
    where: { serialNumber: serial },
  });
  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  // Verify Apple pass auth token (sent as "ApplePass <token>" header)
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("ApplePass ", "");

  // For initial download requests (no auth header), allow access.
  // For update requests from iOS (with ApplePass auth), verify token.
  if (authHeader && token !== pass.authToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passJson = await generateMasterPassJson(
    pass.userId,
    pass.serialNumber,
    pass.authToken
  );

  // Update last updated timestamp
  await db.walletPass.update({
    where: { id: pass.id },
    data: { lastUpdatedAt: new Date() },
  });

  // Check if signing certificates are available
  const hasCerts = !!(
    process.env.APPLE_PASS_CERTIFICATE &&
    process.env.APPLE_PASS_KEY &&
    process.env.APPLE_WWDR_CERTIFICATE
  );

  if (hasCerts) {
    // In production: generate signed .pkpass bundle
    // This is where passkit-generator would be used:
    //
    // import { PKPass } from "passkit-generator";
    // const pkpass = new PKPass({}, {
    //   wwdr: Buffer.from(process.env.APPLE_WWDR_CERTIFICATE!, "base64"),
    //   signerCert: Buffer.from(process.env.APPLE_PASS_CERTIFICATE!, "base64"),
    //   signerKey: Buffer.from(process.env.APPLE_PASS_KEY!, "base64"),
    //   signerKeyPassphrase: process.env.APPLE_PASS_CERT_PASSWORD,
    // });
    //
    // // Set pass data
    // pkpass.setJSON(passJson);
    //
    // // Add images (would come from public/ or a CDN)
    // pkpass.addBuffer("icon.png", iconBuffer);
    // pkpass.addBuffer("icon@2x.png", icon2xBuffer);
    // pkpass.addBuffer("logo.png", logoBuffer);
    //
    // const buffer = pkpass.getAsBuffer();
    //
    // return new NextResponse(buffer, {
    //   headers: {
    //     "Content-Type": "application/vnd.apple.pkpass",
    //     "Content-Disposition": `attachment; filename="receiptiles-pass.pkpass"`,
    //     "Last-Modified": new Date().toUTCString(),
    //   },
    // });

    // For now, even with certs present, return JSON until passkit-generator is added
    return NextResponse.json(passJson, {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass+json",
        "Last-Modified": new Date().toUTCString(),
        "X-Signing-Status": "certificates-available-awaiting-passkit-generator",
      },
    });
  }

  // Return unsigned pass.json with informational headers
  return NextResponse.json(passJson, {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass+json",
      "Last-Modified": new Date().toUTCString(),
      "X-Signing-Status": "unsigned",
      "X-Signing-Note":
        "Set APPLE_PASS_CERTIFICATE, APPLE_PASS_KEY, and APPLE_WWDR_CERTIFICATE env vars to enable .pkpass signing",
    },
  });
}

