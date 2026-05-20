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
 *
 * Design philosophy: MINIMAL front, DETAILED back.
 * - Front: Big receipt count + month spend + latest merchant. That's it.
 * - Back: Each receipt with itemized detail, warranty/return inline, eco footer.
 *
 * NOTE on Express Mode (tap without Face ID):
 * Express Mode cannot be enabled programmatically. It requires:
 * 1. Apple partnership application for "Access" or "Transit" category
 * 2. Apple reviews and approves the application
 * 3. They provide a special entitlement
 * Apply at: developer.apple.com/wallet/access
 */
export async function generateMasterPassJson(
  userId: string,
  serialNumber: string,
  authToken: string
): Promise<ApplePassData> {
  // Fetch latest receipts with items for detailed back fields
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
      warrantyExpiresAt: true,
      returnExpiresAt: true,
      items: {
        select: {
          name: true,
          quantity: true,
          totalPrice: true,
        },
      },
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

  // Build back fields — each receipt is its own field with itemized detail
  const backFields: Array<{ key: string; label: string; value: string }> = [];

  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const label = `${r.merchantCanonicalName} · ${formatDate(r.purchasedAt)}`;

    // Build value: total + item names
    const itemNames = r.items
      .map((item) =>
        item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name
      )
      .join(", ");

    let value = `${formatCurrency(r.total)}`;
    if (itemNames) {
      value += ` — ${itemNames}`;
    }

    // Inline warranty/return info
    if (r.warrantyExpiresAt && r.warrantyExpiresAt > now) {
      value += `\n🛡️ Warranty until ${formatDate(r.warrantyExpiresAt)}`;
    }
    if (r.returnExpiresAt && r.returnExpiresAt > now) {
      value += `\n↩️ Return by ${formatDate(r.returnExpiresAt)}`;
    }

    backFields.push({ key: `r${i}`, label, value });
  }

  // Footer section
  backFields.push({
    key: "ecoFooter",
    label: "─────────────",
    value: `🌱 ${totalReceiptCount} receipts saved · ${eco.co2Saved} CO₂ prevented\nTap at any terminal · receiptiles.com`,
  });

  // Express Mode informational note
  backFields.push({
    key: "expressMode",
    label: "Express Mode",
    value:
      "Apply at developer.apple.com/wallet/access to enable tap without Face ID",
  });

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
    logoText: "",
    generic: {
      headerFields: [],
      primaryFields: [
        {
          key: "count",
          label: "",
          value: `${totalReceiptCount} Receipts`,
        },
      ],
      secondaryFields: [
        {
          key: "monthSpend",
          label: "this month",
          value: formatCurrency(monthTotal),
        },
        {
          key: "latest",
          label: "latest",
          value: lastReceipt ? lastReceipt.merchantCanonicalName : "—",
        },
      ],
      auxiliaryFields: [],
      backFields,
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
