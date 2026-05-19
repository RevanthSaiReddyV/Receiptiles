import crypto from "crypto";
import { db } from "@receipts/db";

/**
 * Google Wallet "Master Receipt Pass" using the Generic Pass type.
 * Uses Google Wallet API to create and update passes.
 *
 * Google Smart Tap:
 * - Pass includes a Smart Tap ID for NFC handover at compatible terminals
 * - When tapped, triggers receipt delivery to the phone
 */

export interface GooglePassObject {
  id: string;
  classId: string;
  state: string;
  cardTitle: { defaultValue: { language: string; value: string } };
  header: { defaultValue: { language: string; value: string } };
  subheader?: { defaultValue: { language: string; value: string } };
  hexBackgroundColor: string;
  logo: { sourceUri: { uri: string } };
  textModulesData: Array<{
    id: string;
    header: string;
    body: string;
  }>;
  linksModuleData?: {
    uris: Array<{ uri: string; description: string; id: string }>;
  };
  barcode?: {
    type: string;
    value: string;
    alternateText?: string;
  };
  smartTapRedemptionValue?: string;
  notifications?: {
    upcomingNotification: { enableNotification: boolean };
  };
}

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID ?? "";
const CLASS_ID = `${ISSUER_ID}.receiptiles-member`;
const BASE_URL = "https://receiptiles.com";

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
 * Calculate eco impact stats.
 */
function calculateEcoImpact(receiptCount: number) {
  const treesSaved = receiptCount / 8333;
  const co2Saved = receiptCount * 0.0057; // kg
  return {
    treesSaved:
      treesSaved >= 0.01 ? treesSaved.toFixed(2) : treesSaved.toFixed(4),
    co2Saved:
      co2Saved >= 1
        ? `${co2Saved.toFixed(1)} kg`
        : `${(co2Saved * 1000).toFixed(0)} g`,
  };
}

/**
 * Generate Google Wallet pass object JSON.
 */
export async function generateGooglePassObject(
  userId: string,
  serialNumber: string
): Promise<GooglePassObject> {
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
    },
  });

  // Calculate monthly stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReceipts = receipts.filter((r) => r.purchasedAt >= monthStart);
  const monthTotal = monthReceipts.reduce((sum, r) => sum + r.total, 0);

  const lastReceipt = receipts[0];
  const totalReceiptCount = await db.receipt.count({ where: { userId } });
  const eco = calculateEcoImpact(totalReceiptCount);

  return {
    id: `${ISSUER_ID}.${serialNumber}`,
    classId: CLASS_ID,
    state: "ACTIVE",
    cardTitle: {
      defaultValue: {
        language: "en-US",
        value: "Receiptiles",
      },
    },
    header: {
      defaultValue: {
        language: "en-US",
        value: lastReceipt
          ? `${lastReceipt.merchantCanonicalName} — ${formatCurrency(lastReceipt.total)}`
          : "Digital Receipts",
      },
    },
    subheader: {
      defaultValue: {
        language: "en-US",
        value: `${monthReceipts.length} receipts this month — ${formatCurrency(monthTotal)} total`,
      },
    },
    hexBackgroundColor: "#242D28",
    logo: {
      sourceUri: {
        uri: `${BASE_URL}/icon-wallet.png`,
      },
    },
    textModulesData: [
      {
        id: "recent",
        header: "Recent Purchases",
        body:
          receipts.length > 0
            ? receipts
                .slice(0, 5)
                .map(
                  (r) =>
                    `${formatDate(r.purchasedAt)} - ${r.merchantCanonicalName}: ${formatCurrency(r.total)}`
                )
                .join("\n")
            : "No receipts yet. Tap at terminals or sync your accounts.",
      },
      {
        id: "stats",
        header: "Monthly Summary",
        body: `Total: ${formatCurrency(monthTotal)}\nTransactions: ${monthReceipts.length}`,
      },
      {
        id: "eco",
        header: "Eco Impact",
        body: `Trees saved: ${eco.treesSaved}\nCO₂ prevented: ${eco.co2Saved}\nPaper receipts eliminated: ${totalReceiptCount}`,
      },
    ],
    linksModuleData: {
      uris: [
        {
          uri: `${BASE_URL}/receipts`,
          description: "View all receipts",
          id: "view-receipts",
        },
        {
          uri: BASE_URL,
          description: "Receiptiles",
          id: "website",
        },
      ],
    },
    barcode: {
      type: "QR_CODE",
      value: `${BASE_URL}/claim/${serialNumber}`,
      alternateText: "Receiptiles",
    },
    smartTapRedemptionValue: serialNumber,
    notifications: {
      upcomingNotification: { enableNotification: true },
    },
  };
}

/**
 * Create or retrieve Google Wallet pass for user.
 */
export async function getOrCreateGoogleWalletPass(userId: string) {
  let pass = await db.walletPass.findFirst({
    where: { userId, platform: "google", isActive: true },
  });

  if (!pass) {
    const serialNumber = `grcpt_${crypto.randomBytes(16).toString("hex")}`;
    const authToken = crypto.randomBytes(32).toString("hex");

    pass = await db.walletPass.create({
      data: {
        userId,
        platform: "google",
        serialNumber,
        authToken,
      },
    });
  }

  return pass;
}

/**
 * Generate a Google Wallet "Save" link (JWT-based).
 * In production, this JWT would be signed with the service account key.
 */
export function generateSaveLink(passObject: GooglePassObject): string {
  return `${BASE_URL}/api/wallet/google/save?id=${encodeURIComponent(passObject.id)}`;
}
