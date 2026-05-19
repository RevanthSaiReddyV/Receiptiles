/**
 * Apple Wallet Pass Generation Utilities
 *
 * Requires Apple Developer account ($99/year) with:
 * - Pass Type ID certificate
 * - WWDR intermediate certificate
 *
 * Environment variables needed:
 * - APPLE_TEAM_ID
 * - APPLE_PASS_TYPE_ID (e.g., pass.com.receiptiles.receipts)
 * - APPLE_PASS_CERTIFICATE (base64 encoded .p12 certificate)
 * - APPLE_PASS_KEY (base64 encoded private key PEM)
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
    passTypeIdentifier:
      process.env.APPLE_PASS_TYPE_ID ?? "pass.com.receiptiles.receipts",
    serialNumber: data.serialNumber,
    teamIdentifier: process.env.APPLE_TEAM_ID ?? "",
    organizationName: "Receiptiles",
    description: "Receiptiles Digital Receipt Wallet",
    logoText: "Receiptiles",
    foregroundColor: "rgb(247, 246, 242)", // #F7F6F2
    backgroundColor: "rgb(36, 45, 40)", // #242D28
    labelColor: "rgb(130, 144, 122)", // #82907A

    authenticationToken: data.authToken,
    webServiceURL: "https://receiptiles.com/api/wallet/apple",

    barcode: {
      format: "PKBarcodeFormatQR",
      message: `https://receiptiles.com/wallet?user=${data.userId}`,
      messageEncoding: "iso-8859-1",
      altText: "Receiptiles",
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
          value:
            data.co2Saved >= 1
              ? `${data.co2Saved.toFixed(1)} kg`
              : `${(data.co2Saved * 1000).toFixed(0)} g`,
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
          label: "About Receiptiles",
          value:
            "Receiptiles automatically captures and organizes all your receipts from email, POS systems, and uploads. Save trees, track spending, and optimize your credit card rewards.",
        },
        {
          key: "website",
          label: "Website",
          value: "https://receiptiles.com",
        },
      ],
    },
  };
}

export function isAppleWalletConfigured(): boolean {
  return !!(
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_PASS_TYPE_ID &&
    process.env.APPLE_PASS_CERTIFICATE
  );
}
