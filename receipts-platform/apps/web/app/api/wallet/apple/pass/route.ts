import { NextRequest, NextResponse } from "next/server";
import { PKPass } from "passkit-generator";
import fs from "fs";
import path from "path";
import { generateMasterPassJson } from "@/lib/wallet/apple-pass";
import { db } from "@receipts/db";

function loadPassAssets(): Record<string, Buffer> {
  const assetsDir = path.join(process.cwd(), "public", "pass-assets");
  const buffers: Record<string, Buffer> = {};
  try {
    const files = fs.readdirSync(assetsDir);
    for (const file of files) {
      if (file.endsWith(".png")) {
        buffers[file] = fs.readFileSync(path.join(assetsDir, file));
      }
    }
  } catch {
    // Assets dir may not exist in all environments
  }
  return buffers;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serial = searchParams.get("serial");
  const tok = searchParams.get("tok");

  if (!serial) {
    return NextResponse.json({ error: "Missing serial" }, { status: 400 });
  }

  const pass = await db.walletPass.findUnique({
    where: { serialNumber: serial },
  });
  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  // Auth: either Apple's "ApplePass <token>" header (for pass updates from iOS)
  // or a signed `tok` query param (for initial download from browser)
  const authHeader = request.headers.get("authorization");
  const appleToken = authHeader?.replace("ApplePass ", "");

  if (authHeader) {
    if (appleToken !== pass.authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (tok !== pass.authToken) {
    return NextResponse.json({ error: "Unauthorized — invalid or missing token" }, { status: 401 });
  }

  const passJson = await generateMasterPassJson(
    pass.userId,
    pass.serialNumber,
    pass.authToken
  );

  await db.walletPass.update({
    where: { id: pass.id },
    data: { lastUpdatedAt: new Date() },
  });

  const certB64 = process.env.APPLE_PASS_CERTIFICATE;
  const keyB64 = process.env.APPLE_PASS_KEY;
  const wwdrB64 = process.env.APPLE_WWDR_CERTIFICATE;

  if (!certB64 || !keyB64 || !wwdrB64) {
    return NextResponse.json(passJson, {
      headers: {
        "Content-Type": "application/json",
        "X-Signing-Status": "unsigned-certs-missing",
      },
    });
  }

  try {
    const signerCert = Buffer.from(certB64, "base64");
    const signerKey = Buffer.from(keyB64, "base64");
    const wwdr = Buffer.from(wwdrB64, "base64");

    const assets = loadPassAssets();
    const pkpass = new PKPass(
      assets,
      {
        wwdr,
        signerCert,
        signerKey,
        signerKeyPassphrase: process.env.APPLE_PASS_CERT_PASSWORD || undefined,
      },
      {
        formatVersion: 1,
        passTypeIdentifier: passJson.passTypeIdentifier,
        serialNumber: passJson.serialNumber,
        teamIdentifier: passJson.teamIdentifier,
        organizationName: passJson.organizationName,
        description: passJson.description,
        authenticationToken: passJson.authenticationToken,
        webServiceURL: passJson.webServiceURL,
        backgroundColor: "#1a2e1f",
        foregroundColor: passJson.foregroundColor,
        labelColor: passJson.labelColor,
        logoText: passJson.logoText,
      }
    );

    pkpass.type = "generic";

    for (const f of passJson.generic.headerFields) pkpass.headerFields.push(f);
    for (const f of passJson.generic.primaryFields) pkpass.primaryFields.push(f);
    for (const f of passJson.generic.secondaryFields) pkpass.secondaryFields.push(f);
    for (const f of passJson.generic.auxiliaryFields) pkpass.auxiliaryFields.push(f);
    for (const f of passJson.generic.backFields) pkpass.backFields.push(f);

    if (passJson.barcodes?.length) {
      pkpass.setBarcodes(...passJson.barcodes.map(b => ({
        message: b.message,
        format: b.format as "PKBarcodeFormatQR",
        messageEncoding: b.messageEncoding,
        altText: b.altText,
      })));
    }

    const buffer = pkpass.getAsBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="receiptiles-${serial.slice(0, 8)}.pkpass"`,
        "Last-Modified": new Date().toUTCString(),
      },
    });
  } catch (err) {
    console.error("[Apple Pass] Signing error:", err);
    return NextResponse.json(
      { error: "Failed to generate signed pass", details: String(err) },
      { status: 500 }
    );
  }
}
