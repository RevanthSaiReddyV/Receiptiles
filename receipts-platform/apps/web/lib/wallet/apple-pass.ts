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
  passType?: "storeCard" | "generic";
  fields?: {
    headerFields: PassField[];
    primaryFields: PassField[];
    secondaryFields: PassField[];
    auxiliaryFields: PassField[];
    backFields: PassField[];
  };
  generic?: {
    headerFields: PassField[];
    primaryFields: PassField[];
    secondaryFields: PassField[];
    auxiliaryFields: PassField[];
    backFields: PassField[];
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

interface PassField {
  key: string;
  label: string;
  value: string | number;
  textAlignment?: "PKTextAlignmentLeft" | "PKTextAlignmentCenter" | "PKTextAlignmentRight" | "PKTextAlignmentNatural";
}

const PASS_TYPE_ID =
  process.env.APPLE_PASS_TYPE_ID ?? "pass.com.receiptiles.receipts";
const TEAM_ID = process.env.APPLE_TEAM_ID ?? "";
const WEB_SERVICE_URL = "https://receiptiles.com/api/wallet/apple";

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
 * Apple Wallet Store Card — renders like a loyalty/membership card.
 *
 * FRONT (card face):
 *   Header (top-right):  Receipt count
 *   Primary (center):    "TapForReceipts" brand
 *   Secondary (below):   This month count + latest merchant
 *   Auxiliary (bottom):  Card number + member name
 *
 * BACK (tap ⓘ):
 *   - Eco impact stats (trees, paper, CO₂)
 *   - Last 10 receipts with items + warranty/return info
 *   - Eco footer
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
        select: { name: true, quantity: true, totalPrice: true },
      },
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthReceipts = receipts.filter((r) => r.purchasedAt >= monthStart);
  const monthTotal = monthReceipts.reduce((sum, r) => sum + r.total, 0);
  const lastReceipt = receipts[0];

  const totalReceiptCount = await db.receipt.count({ where: { userId } });
  const eco = calculateEcoImpact(totalReceiptCount);

  const memberYear = user?.createdAt?.getFullYear() ?? 2026;
  const cardNumber = `TFR •• ${memberYear} •• ${String(totalReceiptCount).padStart(4, "0")}`;
  const memberName = user?.name?.toUpperCase() ?? "MEMBER";

  // BACK FIELDS — detailed receipt history
  const backFields: PassField[] = [];

  // Eco impact section on back
  backFields.push({
    key: "ecoTitle",
    label: "Environmental Impact",
    value: `🌱 ${eco.treesSaved} trees · 📄 ${eco.paperAvoided} paper · 💨 ${eco.co2Saved} CO₂`,
  });

  // Receipt list
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
    key: "footer",
    label: "─────────────",
    value: `${totalReceiptCount} digital receipts · No paper wasted\nTap at any terminal · receiptiles.com`,
  });

  return {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    serialNumber,
    teamIdentifier: TEAM_ID,
    organizationName: "Receiptiles",
    description: "TapForReceipts — Digital Receipt Card",
    authenticationToken: authToken,
    webServiceURL: WEB_SERVICE_URL,
    backgroundColor: "#242D28",
    foregroundColor: "#F7F6F2",
    labelColor: "#82907A",
    logoText: "",
    passType: "storeCard",
    fields: {
      headerFields: [
        {
          key: "receiptCount",
          label: "RECEIPTS",
          value: totalReceiptCount,
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      primaryFields: [
        {
          key: "brand",
          label: "",
          value: "TapForReceipts",
        },
      ],
      secondaryFields: [
        {
          key: "thisMonth",
          label: "THIS MONTH",
          value: `${monthReceipts.length} receipts · ${formatCurrency(monthTotal)}`,
        },
        {
          key: "latest",
          label: "LATEST",
          value: lastReceipt ? lastReceipt.merchantCanonicalName : "Ready to tap",
          textAlignment: "PKTextAlignmentRight",
        },
      ],
      auxiliaryFields: [
        {
          key: "cardNumber",
          label: "CARD",
          value: cardNumber,
        },
        {
          key: "ecoStatus",
          label: "ECO STATUS",
          value: "● Active",
          textAlignment: "PKTextAlignmentCenter",
        },
        {
          key: "member",
          label: "MEMBER",
          value: memberName,
          textAlignment: "PKTextAlignmentRight",
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
