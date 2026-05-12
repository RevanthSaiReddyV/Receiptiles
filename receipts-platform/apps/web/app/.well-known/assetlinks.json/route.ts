import { NextResponse } from "next/server";

/**
 * Android Asset Links for App Links (Deep Links).
 * Tells Android which URL paths should open in the native app.
 */
export async function GET() {
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.receiptsplatform.app",
          sha256_cert_fingerprints: [
            // Add your app signing key SHA-256 fingerprints here
            process.env.ANDROID_SHA256_FINGERPRINT ?? "TODO:ADD_FINGERPRINT",
          ],
        },
      },
    ],
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
