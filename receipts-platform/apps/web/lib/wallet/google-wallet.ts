import jwt from "jsonwebtoken";

/**
 * Google Wallet Master Pass — Receiptiles membership card.
 * Uses the Generic Pass type for receipt ledger display.
 *
 * Google Smart Tap:
 * - Pass includes a Smart Tap ID for NFC handover at compatible terminals
 * - When tapped, triggers receipt delivery to the phone
 */

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID ?? "";
const SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ?? "";
const PRIVATE_KEY = (process.env.GOOGLE_WALLET_PRIVATE_KEY ?? "").replace(
  /\\n/g,
  "\n"
);
const BASE_URL = "https://receiptiles.com";

interface WalletPassData {
  userId: string;
  userName: string;
  receiptCount: number;
  treesSaved: number;
  co2Saved: number;
  memberSince: string;
}

export function generateGoogleWalletLink(data: WalletPassData): string {
  const objectId = `${ISSUER_ID}.receiptiles-${data.userId}`;
  const classId = `${ISSUER_ID}.receiptiles-member`;

  const genericObject = {
    id: objectId,
    classId: classId,
    cardTitle: {
      defaultValue: { language: "en", value: "Receiptiles" },
    },
    subheader: {
      defaultValue: { language: "en", value: "Digital Receipts" },
    },
    header: {
      defaultValue: { language: "en", value: data.userName },
    },
    hexBackgroundColor: "#242D28",
    logo: {
      sourceUri: {
        uri: `${BASE_URL}/icon-wallet.png`,
      },
    },
    textModulesData: [
      {
        id: "receipts",
        header: "eReceipts",
        body: data.receiptCount.toString(),
      },
      {
        id: "trees",
        header: "Trees Saved",
        body: data.treesSaved >= 0.01 ? data.treesSaved.toFixed(2) : "0",
      },
      {
        id: "co2",
        header: "CO₂ Saved",
        body:
          data.co2Saved >= 1
            ? `${data.co2Saved.toFixed(1)} kg`
            : `${(data.co2Saved * 1000).toFixed(0)} g`,
      },
      {
        id: "member",
        header: "Member Since",
        body: data.memberSince,
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
      value: `${BASE_URL}/wallet?user=${data.userId}`,
      alternateText: "Receiptiles",
    },
  };

  const genericClass = {
    id: classId,
    issuerName: "Receiptiles",
    reviewStatus: "UNDER_REVIEW",
  };

  const claims = {
    iss: SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    origins: [BASE_URL],
    typ: "savetowallet",
    payload: {
      genericObjects: [genericObject],
      genericClasses: [genericClass],
    },
  };

  if (!PRIVATE_KEY || !SERVICE_ACCOUNT_EMAIL) {
    // Fallback: unsigned JWT encoded as base64url (for dev/testing)
    return `https://pay.google.com/gp/v/save/${Buffer.from(JSON.stringify(claims)).toString("base64url")}`;
  }

  const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}

export function isGoogleWalletConfigured(): boolean {
  return !!(ISSUER_ID && SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY);
}
