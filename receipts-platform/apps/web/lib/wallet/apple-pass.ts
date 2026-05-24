import crypto from "crypto";
import { db } from "@receipts/db";

export interface ApplePassData {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  authenticationToken: string;
  webServiceURL: string;
  backgroundColor?: string;
  foregroundColor: string;
  labelColor: string;
  logoText: string;
  generic: {
    headerFields: Array<{ key: string; label: string; value: string | number; textAlignment?: "PKTextAlignmentLeft" | "PKTextAlignmentCenter" | "PKTextAlignmentRight" | "PKTextAlignmentNatural" }>;
    primaryFields: Array<{ key: string; label: string; value: string | number }>;
    secondaryFields: Array<{ key: string; label: string; value: string | number }>;
    auxiliaryFields: Array<{ key: string; label: string; value: string | number }>;
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

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function calculateEcoImpact(receiptCount: number) {
  const treesSaved = receiptCount / 8333;
  const paperAvoidedKg = (receiptCount * 3.15) / 1000;
  const co2SavedKg = receiptCount * 0.0057;

  return {
    treesSaved: treesSaved >= 1 ? treesSaved.toFixed(1) : treesSaved.toFixed(2),
    paperAvoided: paperAvoidedKg >= 1
      ? `${paperAvoidedKg.toFixed(1)} kg`
      : `${(paperAvoidedKg * 1000).toFixed(0)} g`,
    paperAvoidedKg: paperAvoidedKg.toFixed(1),
    co2Saved: co2SavedKg >= 1
      ? `${co2SavedKg.toFixed(2)} kg`
      : `${(co2SavedKg * 1000).toFixed(0)} g`,
    co2SavedKg: co2SavedKg.toFixed(2),
  };
}

/**
 * Generate pass.json matching the TapForReceipts design:
 * - Background: dark forest image
 * - Front: brand + "ECO ACTIVE" badge, this month count, total receipts
 * - Bottom: Trees Saved | Paper Avoided | CO₂ Saved + card number + user name
 * - Back: full receipt history with itemized detail + warranty/return info
 */
export async function generateMasterPassJson(
  userId: string,
  serialNumber: string,
  authToken: string
): Promise<ApplePassData> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, createdAt: true },
  });

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

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReceipts = receipts.filter((r) => r.purchasedAt >= monthStart);

  const totalReceiptCount = await db.receipt.count({ where: { userId } });
  const eco = calculateEcoImpact(totalReceiptCount);

  const cardNumber = `TFR •• ${user?.createdAt?.getFullYear() ?? "2026"} •• ${String(totalReceiptCount).padStart(4, "0")}`;
  const memberName = user?.name?.toUpperCase() ?? "MEMBER";

  // Back fields — itemized receipts
  const backFields: Array<{ key: string; label: string; value: string }> = [];

  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];
    const label = `${r.merchantCanonicalName} · ${formatDate(r.purchasedAt)}`;
    const itemNames = r.items
      .map((item) => item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name)
      .join(", ");

    let value = formatCurrency(r.total);
    if (itemNames) value += ` — ${itemNames}`;
    if (r.warrantyExpiresAt && r.warrantyExpiresAt > now) {
      value += `\n🛡️ Warranty until ${formatDate(r.warrantyExpiresAt)}`;
    }
    if (r.returnExpiresAt && r.returnExpiresAt > now) {
      value += `\n↩️ Return by ${formatDate(r.returnExpiresAt)}`;
    }

    backFields.push({ key: `r${i}`, label, value });
  }

  backFields.push({
    key: "ecoFooter",
    label: "─────────────",
    value: `🌱 ${totalReceiptCount} receipts saved · ${eco.co2Saved} CO₂ prevented\nTap at any terminal · receiptiles.com`,
  });

  return {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    serialNumber,
    teamIdentifier: TEAM_ID,
    organizationName: "Receiptiles",
    description: "TapForReceipts — Digital Receipt Pass",
    authenticationToken: authToken,
    webServiceURL: WEB_SERVICE_URL,
    foregroundColor: "#FFFFFF",
    labelColor: "#A0AFAA",
    logoText: "",
    generic: {
      headerFields: [
        {
          key: "totalReceipts",
          label: "RECEIPTS",
          value: totalReceiptCount,
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      primaryFields: [
        {
          key: "monthCount",
          label: "THIS MONTH",
          value: `${monthReceipts.length} receipts`,
        },
      ],
      secondaryFields: [
        {
          key: "treesSaved",
          label: "TREES SAVED",
          value: eco.treesSaved,
        },
        {
          key: "paperAvoided",
          label: "PAPER AVOIDED",
          value: eco.paperAvoided,
        },
        {
          key: "co2Saved",
          label: "CO₂ SAVED",
          value: eco.co2Saved,
        },
      ],
      auxiliaryFields: [
        {
          key: "cardNumber",
          label: "",
          value: cardNumber,
        },
        {
          key: "memberName",
          label: "",
          value: memberName,
        },
      ],
      backFields,
    },
    nfc: {
      message: "com.receiptiles.tap",
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
