/**
 * Apple Wallet Pass Generation
 *
 * Requires Apple Developer account ($99/year) with:
 * - Pass Type ID certificate
 * - WWDR intermediate certificate
 *
 * Environment variables needed:
 * - APPLE_TEAM_ID
 * - APPLE_PASS_TYPE_ID (e.g., pass.com.allmyreceipts.card)
 * - APPLE_PASS_CERT (base64 encoded .p12 certificate)
 * - APPLE_PASS_CERT_PASSWORD
 */

interface ApplePassData {
  userId: string;
  userName: string;
  receiptCount: number;
  treesSaved: number;
  co2Saved: number;
  memberSince: string;
  serialNumber: string;
  authToken: string;
}

export function generateApplePassJson(data: ApplePassData) {
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID ?? "pass.com.allmyreceipts.card",
    serialNumber: data.serialNumber,
    teamIdentifier: process.env.APPLE_TEAM_ID ?? "",
    organizationName: "AllMyReceipts",
    description: "AllMyReceipts Digital Wallet",
    logoText: "AllMyReceipts",
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(10, 10, 10)",
    labelColor: "rgb(16, 185, 129)",

    authenticationToken: data.authToken,
    webServiceURL: `${process.env.NEXTAUTH_URL}/api/wallet/apple`,

    barcode: {
      format: "PKBarcodeFormatQR",
      message: `https://receipts-platform.vercel.app/wallet?user=${data.userId}`,
      messageEncoding: "iso-8859-1",
      altText: "AllMyReceipts",
    },

    generic: {
      primaryFields: [
        {
          key: "receipts",
          label: "eReceipts",
          value: data.receiptCount.toString(),
        },
      ],
      secondaryFields: [
        {
          key: "trees",
          label: "Trees Saved",
          value: data.treesSaved >= 0.01 ? data.treesSaved.toFixed(2) : "0",
        },
        {
          key: "co2",
          label: "CO₂ Saved",
          value: data.co2Saved >= 1 ? `${data.co2Saved.toFixed(1)} kg` : `${(data.co2Saved * 1000).toFixed(0)} g`,
        },
      ],
      auxiliaryFields: [
        {
          key: "member",
          label: "Member",
          value: data.userName,
        },
        {
          key: "since",
          label: "Since",
          value: data.memberSince,
        },
      ],
      backFields: [
        {
          key: "impact",
          label: "Your Environmental Impact",
          value: `You've eliminated ${data.receiptCount} paper receipts, saving approximately ${data.treesSaved.toFixed(4)} trees and ${data.co2Saved >= 1 ? data.co2Saved.toFixed(1) + " kg" : (data.co2Saved * 1000).toFixed(0) + " g"} of CO₂ emissions.`,
        },
        {
          key: "about",
          label: "About AllMyReceipts",
          value: "AllMyReceipts automatically captures and organizes all your receipts from email, POS systems, and uploads. Save trees, track spending, and optimize your credit card rewards.",
        },
        {
          key: "website",
          label: "Website",
          value: "https://allmyreceipts.com",
        },
      ],
    },
  };
}

export function isAppleWalletConfigured(): boolean {
  return !!(
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_PASS_TYPE_ID &&
    process.env.APPLE_PASS_CERT
  );
}
