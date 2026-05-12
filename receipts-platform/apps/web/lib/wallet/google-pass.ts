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
  header: { defaultValue: { language: string; value: string } };
  subheader?: { defaultValue: { language: string; value: string } };
  textModulesData: Array<{
    id: string;
    header: string;
    body: string;
  }>;
  linksModuleData?: {
    uris: Array<{ uri: string; description: string }>;
  };
  barcode?: {
    type: string;
    value: string;
  };
  smartTapRedemptionValue?: string;
  notifications?: {
    upcomingNotification: { enableNotification: boolean };
  };
}

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID ?? "";
const CLASS_ID = `${ISSUER_ID}.receipts_master`;

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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReceipts = receipts.filter((r) => r.purchasedAt >= monthStart);
  const monthTotal = monthReceipts.reduce((sum, r) => sum + r.total, 0);

  const lastReceipt = receipts[0];
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://receipts.app";

  return {
    id: `${ISSUER_ID}.${serialNumber}`,
    classId: CLASS_ID,
    state: "ACTIVE",
    header: {
      defaultValue: {
        language: "en-US",
        value: lastReceipt
          ? `${lastReceipt.merchantCanonicalName} — $${lastReceipt.total.toFixed(2)}`
          : "Receipts",
      },
    },
    subheader: {
      defaultValue: {
        language: "en-US",
        value: `${monthReceipts.length} receipts this month • $${monthTotal.toFixed(2)} total`,
      },
    },
    textModulesData: [
      {
        id: "recent",
        header: "Recent Purchases",
        body: receipts.length > 0
          ? receipts
              .slice(0, 5)
              .map(
                (r) =>
                  `${r.purchasedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${r.merchantCanonicalName}: $${r.total.toFixed(2)}`
              )
              .join("\n")
          : "No receipts yet. Tap at terminals or sync your accounts.",
      },
      {
        id: "stats",
        header: "Monthly Summary",
        body: `Total: $${monthTotal.toFixed(2)}\nTransactions: ${monthReceipts.length}`,
      },
    ],
    linksModuleData: {
      uris: [
        {
          uri: `${baseUrl}/receipts`,
          description: "View all receipts",
        },
      ],
    },
    barcode: {
      type: "QR_CODE",
      value: `${baseUrl}/claim/${serialNumber}`,
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
  // In production: sign JWT with Google Cloud service account
  // For now, return the API endpoint that generates the signed URL
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://receipts.app";
  return `${baseUrl}/api/wallet/google/save?id=${encodeURIComponent(passObject.id)}`;
}
