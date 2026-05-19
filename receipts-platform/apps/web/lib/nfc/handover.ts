/**
 * NFC Handover API client
 *
 * Calls POST /api/device/nfc-handover with the wallet pass serial number
 * to generate a claim token and URL for the tap-to-receive flow.
 */

export interface HandoverResult {
  claimUrl: string;
  claimToken: string;
  expiresAt: string;
  ndefPayload: {
    type: string;
    url: string;
  };
}

export interface HandoverError {
  error: string;
  status: number;
}

/**
 * Perform the NFC handover API call.
 *
 * In production, this requires a device API key (dk_<key>).
 * For the test utility, we use a configurable API key or fall back to
 * a simulated response.
 */
export async function performNFCHandover(
  serialNumber: string,
  options?: { apiKey?: string; baseUrl?: string }
): Promise<HandoverResult> {
  const baseUrl = options?.baseUrl ?? "";
  const apiKey = options?.apiKey;

  // If no API key provided, use simulated mode
  if (!apiKey) {
    return simulateHandover(serialNumber, baseUrl);
  }

  const response = await fetch(`${baseUrl}/api/device/nfc-handover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      walletPassSerial: serialNumber,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err: HandoverError = {
      error: (errorData as { error?: string }).error ?? `HTTP ${response.status}`,
      status: response.status,
    };
    throw err;
  }

  return response.json() as Promise<HandoverResult>;
}

/**
 * Simulate the handover flow for demo/testing purposes.
 * Generates a fake claim token and URL that matches the real format.
 */
function simulateHandover(serialNumber: string, baseUrl: string): Promise<HandoverResult> {
  return new Promise((resolve) => {
    // Simulate network latency
    setTimeout(() => {
      const claimToken = generateFakeToken();
      const appUrl = baseUrl || "https://receipts.app";
      const claimUrl = `${appUrl}/claim/${claimToken}`;

      resolve({
        claimUrl,
        claimToken,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        ndefPayload: {
          type: "url",
          url: claimUrl,
        },
      });
    }, 800 + Math.random() * 400);
  });
}

/**
 * Generate a random serial number for simulation
 */
export function generateFakeSerial(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "rcpt_";
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate a fake base64url token (matches crypto.randomBytes(24).toString('base64url'))
 */
function generateFakeToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
