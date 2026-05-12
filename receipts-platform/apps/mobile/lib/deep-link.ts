import { router } from "expo-router";

/**
 * Handle deep links from NFC tap, Universal Links, or QR codes.
 * URL patterns:
 * - https://receipts.app/claim/<token> → Claim NFC receipt
 * - receipts://claim/<token> → Custom scheme claim
 * - https://receipts.app/receipt/<id> → Open receipt detail
 */
export function handleDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    // NFC claim link: /claim/<token>
    const claimMatch = path.match(/^\/claim\/([a-zA-Z0-9_-]+)$/);
    if (claimMatch) {
      const token = claimMatch[1];
      router.push(`/claim/${token}`);
      return;
    }

    // Receipt detail: /receipt/<id>
    const receiptMatch = path.match(/^\/receipt\/([a-zA-Z0-9]+)$/);
    if (receiptMatch) {
      const id = receiptMatch[1];
      router.push(`/receipt/${id}`);
      return;
    }

    // Wallet pass setup: /wallet
    if (path === "/wallet") {
      router.push("/wallet");
      return;
    }
  } catch {
    // Malformed URL — ignore
    console.warn("Invalid deep link:", url);
  }
}
