import crypto from "crypto";
import { db } from "@receipts/db";

/**
 * Apple Wallet "Master Receipt Pass" — a single generic pass that acts as
 * a living receipt ledger. Updated via APNs push when new receipts arrive.
 *
 * Pass structure: Generic pass with:
 * - headerFields: total spend this month, receipt count
 * - primaryFields: last merchant name
 * - secondaryFields: last amount + date
 * - auxiliaryFields: last 3 receipts summary
 * - backFields: full receipt history (last 10) + eco impact stats
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
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  logoText: string;
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
  barcodes?: Array<{
    message: string;
    format: string;
    messageEncoding: string;
    altText?: string;
  }>;
}

const PASS_TYPE_ID =
  process.env.APPLE_PASS_TYPE_ID ?? "pass.com.receiptiles.receipts";
const TEAM_ID = process.env.APPLE_TEAM_ID ?? "";
const WEB_SERVICE_URL = "https://receiptiles.com/api/wallet/apple";

/**
 * Format a number as USD currency string.
 */
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format a date as human-readable (e.g., "May 18").
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Calculate eco impact stats based on receipt count.
 * Average paper receipt: ~3.15g paper, ~0.0057 kg CO2
 * 1 tree = ~8,333 sheets of paper
 */
function calculateEcoImpact(receiptCount: number) {
  const treesSaved = receiptCount / 8333;
  const paperAvoided = receiptCount * 3.15; // grams
  const co2Saved = receiptCount * 0.0057; // kg

  return {
    treesSaved:
      treesSaved >= 0.01 ? treesSaved.toFixed(2) : treesSaved.toFixed(4),
    paperAvoided:
      paperAvoided >= 1000
        ? `${(paperAvoided / 1000).toFixed(1)} kg`
        : `${paperAvoided.toFixed(0)} g`,
    co2Saved:
      co2Saved >= 1
        ? `${co2Saved.toFixed(1)} kg`
        : `${(co2Saved * 1000).toFixed(0)} g`,
  };
}

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

  // Total receipt count for eco impact
  const totalReceiptCount = await db.receipt.count({ where: { userId } });
  const eco = calculateEcoImpact(totalReceiptCount);

  return {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    serialNumber,
    teamIdentifier: TEAM_ID,
    organizationName: "Receiptiles",
    description: "Receiptiles Digital Receipt Pass",
    authenticationToken: authToken,
    webServiceURL: WEB_SERVICE_URL,
    backgroundColor: "#242D28",
    foregroundColor: "#F7F6F2",
    labelColor: "#82907A",
    logoText: "Receiptiles",
    generic: {
      headerFields: [
        {
          key: "monthSpend",
          label: "This Month",
          value: formatCurrency(monthTotal),
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
          label: "LATEST",
          value: lastReceipt
            ? `${lastReceipt.merchantCanonicalName}  ·  ${formatCurrency(lastReceipt.total)}`
            : "Tap to receive your first receipt",
        },
      ],
      secondaryFields: [
        {
          key: "totalSaved",
          label: "TOTAL SAVED",
          value: `${totalReceiptCount} receipts`,
        },
        {
          key: "trees",
          label: "TREES SAVED",
          value: eco.treesSaved,
        },
        {
          key: "co2",
          label: "CO₂ PREVENTED",
          value: eco.co2Saved,
        },
      ],
      auxiliaryFields: receipts.slice(0, 4).map((r, i) => ({
        key: `recent${i}`,
        label: formatDate(r.purchasedAt),
        value: `${r.merchantCanonicalName}  ${formatCurrency(r.total)}`,
      })),
      backFields: [
        ...receipts.map((r, i) => ({
          key: `receipt${i}`,
          label: `${r.merchantCanonicalName}  ·  ${formatDate(r.purchasedAt)}`,
          value: `${formatCurrency(r.total)}  ·  ${r.merchantCategory || "Purchase"}`,
        })),
        {
          key: "divider1",
          label: "━━━━━━━━━━━━━━━━━━━━━━━━━━",
          value: "",
        },
        {
          key: "ecoTitle",
          label: "🌱 YOUR IMPACT",
          value: `${totalReceiptCount} paper receipts eliminated`,
        },
        {
          key: "ecoStats",
          label: "Environmental Savings",
          value: `🌳 ${eco.treesSaved} trees  ·  ♻️ ${eco.paperAvoided} paper  ·  💨 ${eco.co2Saved} CO₂`,
        },
        {
          key: "divider2",
          label: "━━━━━━━━━━━━━━━━━━━━━━━━━━",
          value: "",
        },
        {
          key: "howItWorks",
          label: "HOW IT WORKS",
          value: "Hold your phone near any Receiptiles terminal at checkout. Your receipt appears here automatically — no app needed.",
        },
        {
          key: "manage",
          label: "MANAGE RECEIPTS",
          value: "receiptiles.com/receipts",
        },
      ],
    },
    nfc: {
      message: "com.receiptiles.tap", // VAS merchant identifier for auto-present
      encryptionPublicKey: process.env.APPLE_NFC_ENCRYPTION_KEY || undefined,
    },
    barcodes: [
      {
        message: `https://receiptiles.com/claim/${serialNumber}`,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
        altText: "Receiptiles",
      },
    ],
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
