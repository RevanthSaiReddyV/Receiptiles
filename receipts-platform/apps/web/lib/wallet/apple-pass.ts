import crypto from "crypto";
import { db } from "@receipts/db";

/**
 * Apple Wallet "Master Receipt Pass" — a single generic pass that acts as
 * a living receipt ledger. Updated via APNs push when new receipts arrive.
 *
 * Pass structure: Generic pass with:
 * - headerFields: total spend this month, receipt count
 * - primaryFields: last merchant + amount
 * - secondaryFields: last 3 receipts summary
 * - backFields: full receipt history (last 10)
 *
 * For Apple VAS (Value Added Services) at NFC terminals:
 * - The pass includes a VAS protocol handler
 * - When tapped at a compatible terminal, it triggers receipt delivery
 */

export interface ApplePassData {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  authenticationToken: string;
  webServiceURL: string;
  generic: {
    headerFields: Array<{ key: string; label: string; value: string }>;
    primaryFields: Array<{ key: string; label: string; value: string }>;
    secondaryFields: Array<{ key: string; label: string; value: string }>;
    auxiliaryFields: Array<{ key: string; label: string; value: string }>;
    backFields: Array<{ key: string; label: string; value: string }>;
  };
  nfc?: {
    message: string;
    encryptionPublicKey?: string;
  };
  barcode?: {
    message: string;
    format: string;
    messageEncoding: string;
  };
}

const PASS_TYPE_ID = process.env.APPLE_PASS_TYPE_ID ?? "pass.com.receipts.master";
const TEAM_ID = process.env.APPLE_TEAM_ID ?? "";
const WEB_SERVICE_URL = process.env.NEXTAUTH_URL ?? "https://receipts.app";

/**
 * Generate pass.json for the Master Receipt Pass.
 */
export async function generateMasterPassJson(
  userId: string,
  serialNumber: string,
  authToken: string
): Promise<ApplePassData> {
  // Fetch latest receipts for pass content
  const receipts = await db.receipt.findMany({
    where: { userId },
    orderBy: { purchasedAt: "desc" },
    take: 10,
    select: {
      id: true,
      merchantCanonicalName: true,
      total: true,
      currency: true,
      purchasedAt: true,
      merchantCategory: true,
    },
  });

  // Calculate monthly stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReceipts = receipts.filter((r) => r.purchasedAt >= monthStart);
  const monthTotal = monthReceipts.reduce((sum, r) => sum + r.total, 0);

  const lastReceipt = receipts[0];

  return {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    serialNumber,
    teamIdentifier: TEAM_ID,
    organizationName: "Receipts",
    description: "Master Receipt Pass",
    authenticationToken: authToken,
    webServiceURL: `${WEB_SERVICE_URL}/api/wallet/apple`,
    generic: {
      headerFields: [
        {
          key: "monthSpend",
          label: "This Month",
          value: `$${monthTotal.toFixed(2)}`,
        },
        {
          key: "receiptCount",
          label: "Receipts",
          value: `${monthReceipts.length}`,
        },
      ],
      primaryFields: [
        {
          key: "lastMerchant",
          label: "Last Purchase",
          value: lastReceipt
            ? `${lastReceipt.merchantCanonicalName}`
            : "No receipts yet",
        },
      ],
      secondaryFields: [
        {
          key: "lastAmount",
          label: "Amount",
          value: lastReceipt
            ? `$${lastReceipt.total.toFixed(2)}`
            : "-",
        },
        {
          key: "lastDate",
          label: "Date",
          value: lastReceipt
            ? lastReceipt.purchasedAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "-",
        },
      ],
      auxiliaryFields: receipts.slice(1, 4).map((r, i) => ({
        key: `recent${i}`,
        label: r.merchantCanonicalName,
        value: `$${r.total.toFixed(2)}`,
      })),
      backFields: [
        {
          key: "history",
          label: "Recent History",
          value: receipts
            .map(
              (r) =>
                `${r.purchasedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${r.merchantCanonicalName}: $${r.total.toFixed(2)}`
            )
            .join("\n"),
        },
        {
          key: "info",
          label: "About",
          value:
            "This pass updates automatically when new receipts are added. Tap at compatible terminals to receive digital receipts instantly.",
        },
      ],
    },
    nfc: {
      message: serialNumber, // VAS protocol message
    },
    barcode: {
      message: `${WEB_SERVICE_URL}/claim/${serialNumber}`,
      format: "PKBarcodeFormatQR",
      messageEncoding: "iso-8859-1",
    },
  };
}

/**
 * Create or retrieve the user's wallet pass record.
 */
export async function getOrCreateWalletPass(userId: string) {
  let pass = await db.walletPass.findFirst({
    where: { userId, platform: "apple", isActive: true },
  });

  if (!pass) {
    const serialNumber = `rcpt_${crypto.randomBytes(16).toString("hex")}`;
    const authToken = crypto.randomBytes(32).toString("hex");

    pass = await db.walletPass.create({
      data: {
        userId,
        platform: "apple",
        passTypeId: PASS_TYPE_ID,
        serialNumber,
        authToken,
      },
    });
  }

  return pass;
}
