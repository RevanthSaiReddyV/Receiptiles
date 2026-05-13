import jwt from "jsonwebtoken";

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID ?? "";
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ?? "";
const PRIVATE_KEY = (process.env.GOOGLE_WALLET_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

interface WalletPassData {
  userId: string;
  userName: string;
  receiptCount: number;
  treesSaved: number;
  co2Saved: number;
  memberSince: string;
}

export function generateGoogleWalletLink(data: WalletPassData): string {
  const objectId = `${ISSUER_ID}.allmyreceipts-${data.userId}`;
  const classId = `${ISSUER_ID}.allmyreceipts-card`;

  const genericObject = {
    id: objectId,
    classId: classId,
    cardTitle: {
      defaultValue: { language: "en", value: "AllMyReceipts" },
    },
    subheader: {
      defaultValue: { language: "en", value: "Digital Wallet" },
    },
    header: {
      defaultValue: { language: "en", value: data.userName },
    },
    hexBackgroundColor: "#0a0a0a",
    logo: {
      sourceUri: {
        uri: `${process.env.NEXTAUTH_URL}/icon-wallet.png`,
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
        body: data.co2Saved >= 1 ? `${data.co2Saved.toFixed(1)} kg` : `${(data.co2Saved * 1000).toFixed(0)} g`,
      },
    ],
    barcode: {
      type: "QR_CODE",
      value: `https://receipts-platform.vercel.app/wallet?user=${data.userId}`,
      alternateText: "AllMyReceipts",
    },
  };

  const genericClass = {
    id: classId,
    issuerName: "AllMyReceipts",
    reviewStatus: "UNDER_REVIEW",
  };

  const claims = {
    iss: SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    origins: [process.env.NEXTAUTH_URL ?? "https://receipts-platform.vercel.app"],
    typ: "savetowallet",
    payload: {
      genericObjects: [genericObject],
      genericClasses: [genericClass],
    },
  };

  if (!PRIVATE_KEY || !SERVICE_ACCOUNT_EMAIL) {
    return `https://pay.google.com/gp/v/save/${Buffer.from(JSON.stringify(claims)).toString("base64url")}`;
  }

  const token = jwt.sign(claims, PRIVATE_KEY, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}

export function isGoogleWalletConfigured(): boolean {
  return !!(ISSUER_ID && SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY);
}
