import http2 from "http2";

const APNS_HOST_PRODUCTION = "api.push.apple.com";
const APNS_HOST_SANDBOX = "api.sandbox.push.apple.com";
const PASS_TYPE_ID =
  process.env.APPLE_PASS_TYPE_ID || "pass.com.receiptiles.receipts";

/**
 * Send an APNs push notification to trigger a pass refresh on the user's device.
 *
 * The Pass Type ID certificate (APPLE_PASS_CERTIFICATE + APPLE_PASS_KEY) doubles
 * as the APNs push cert for pass updates. An empty payload `{}` tells Apple Wallet
 * to fetch the updated pass from our webServiceURL.
 */
export async function pushPassUpdate(pushToken: string): Promise<boolean> {
  const certBase64 = process.env.APPLE_PASS_CERTIFICATE;
  const keyBase64 = process.env.APPLE_PASS_KEY;

  if (!certBase64 || !keyBase64) {
    console.warn("[APNs] Missing APPLE_PASS_CERTIFICATE or APPLE_PASS_KEY");
    return false;
  }

  const cert = Buffer.from(certBase64, "base64").toString("utf-8");
  const key = Buffer.from(keyBase64, "base64").toString("utf-8");

  const host =
    process.env.APNS_ENVIRONMENT === "production"
      ? APNS_HOST_PRODUCTION
      : APNS_HOST_SANDBOX;

  return new Promise<boolean>((resolve) => {
    let client: http2.ClientHttp2Session | null = null;

    try {
      client = http2.connect(`https://${host}`, {
        cert,
        key,
      });

      client.on("error", (err) => {
        console.error("[APNs] Connection error:", err.message);
        resolve(false);
      });

      const req = client.request({
        ":method": "POST",
        ":path": `/3/device/${pushToken}`,
        "apns-topic": PASS_TYPE_ID,
        "apns-push-type": "alert",
        "content-type": "application/json",
      });

      req.on("response", (headers) => {
        const status = headers[":status"];
        if (status === 200) {
          resolve(true);
        } else {
          console.warn(
            `[APNs] Push failed for token ${pushToken.slice(0, 8)}... — status ${status}`
          );
          resolve(false);
        }
      });

      req.on("error", (err) => {
        console.error("[APNs] Request error:", err.message);
        resolve(false);
      });

      req.end(JSON.stringify({}));

      // Close the HTTP/2 session after a short delay to allow response
      setTimeout(() => {
        if (client) {
          client.close();
        }
      }, 5000);
    } catch (err) {
      console.error(
        "[APNs] Unexpected error:",
        err instanceof Error ? err.message : err
      );
      if (client) {
        client.close();
      }
      resolve(false);
    }
  });
}
