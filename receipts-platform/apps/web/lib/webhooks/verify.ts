import crypto from "crypto";

/**
 * Verify Square webhook signature.
 * Square sends HMAC-SHA256 signature in x-square-hmacsha256-signature header.
 */
export function verifySquareWebhook(
  body: string,
  signature: string,
  signatureKey: string,
  notificationUrl: string
): boolean {
  const hmac = crypto.createHmac("sha256", signatureKey);
  hmac.update(notificationUrl + body);
  const expected = hmac.digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

/**
 * Verify Toast webhook signature.
 * Toast sends HMAC-SHA256 in x-toast-signature header.
 */
export function verifyToastWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expected = hmac.digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Verify Shopify webhook signature.
 * Shopify sends HMAC-SHA256 in X-Shopify-Hmac-Sha256 header (base64).
 */
export function verifyShopifyWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body, "utf8");
  const expected = hmac.digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Verify device API key (dk_<hex> format).
 */
export function isValidDeviceApiKey(key: string): boolean {
  return /^dk_[a-f0-9]{32,64}$/.test(key);
}
