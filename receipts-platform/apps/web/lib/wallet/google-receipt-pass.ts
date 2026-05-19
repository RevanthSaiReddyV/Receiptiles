import jwt from "jsonwebtoken";
import { db } from "@receipts/db";

/**
 * Google Wallet Individual Receipt Pass — generates a per-receipt Google Wallet
 * pass link using the Generic Pass format.
 *
 * Creates a receipt-specific Google Wallet object with:
 * - Merchant name and logo
 * - Date, total, items summary
 * - Payment method
 * - Link to full receipt detail page
 */

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID ?? "";
const SERVICE_ACCOUNT_EMAIL =
  process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ?? "";
const PRIVATE_KEY = (process.env.GOOGLE_WALLET_PRIVATE_KEY ?? "").replace(
  /\\n/g,
  "\n"
);
const BASE_URL = "https://receiptiles.com";

export interface ReceiptData {
  id: string;
  merchantName: string;
  merchantCategory: string;
  total: number;
  currency: string;
  purchasedAt: Date;
  paymentMethod: string;
  cardLast4?: string | null;
  itemCount: number;
  itemsSummary: string;
  merchantLocation?: string | null;
}

/**
 * Category-based hex background colors for Google Wallet receipts.
 */
const CATEGORY_COLORS: Record<string, string> = {
  "Coffee & Tea": "#3E2723",
  Coffee: "#3E2723",
  Grocery: "#1B5E20",
  Groceries: "#1B5E20",
  Restaurant: "#BF360C",
  "Food & Dining": "#BF360C",
  Shopping: "#1A237E",
  Electronics: "#0D47A1",
  Transportation: "#263238",
  Travel: "#01579B",
  Health: "#004D40",
};

const DEFAULT_BG_COLOR = "#242D28";

/**
 * Format a number as currency string.
 */
function formatCurrency(amount: number, currency: string = "USD"): string {
  if (currency === "USD") return `$${amount.toFixed(2)}`;
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Format a date as human-readable.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format payment method for display.
 */
function formatPaymentMethod(
  method: string,
  cardLast4?: string | null
): string {
  if (cardLast4) return `${method} ****${cardLast4}`;
  if (method === "unknown") return "Not specified";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

/**
 * Generate a Google Wallet "Save" link for a specific receipt.
 */
export function generateGoogleReceiptLink(receipt: ReceiptData): string {
  const objectId = `${ISSUER_ID}.receiptiles-receipt-${receipt.id}`;
  const classId = `${ISSUER_ID}.receiptiles-receipt`;
  const bgColor = CATEGORY_COLORS[receipt.merchantCategory] ?? DEFAULT_BG_COLOR;

  const genericObject = {
    id: objectId,
    classId: classId,
    cardTitle: {
      defaultValue: { language: "en", value: receipt.merchantName },
    },
    subheader: {
      defaultValue: { language: "en", value: formatDate(receipt.purchasedAt) },
    },
    header: {
      defaultValue: {
        language: "en",
        value: formatCurrency(receipt.total, receipt.currency),
      },
    },
    hexBackgroundColor: bgColor,
    logo: {
      sourceUri: {
        uri: `${BASE_URL}/icon-wallet.png`,
      },
    },
    textModulesData: [
      {
        id: "payment",
        header: "Payment",
        body: formatPaymentMethod(receipt.paymentMethod, receipt.cardLast4),
      },
      {
        id: "items",
        header: `Items (${receipt.itemCount})`,
        body: receipt.itemsSummary || "No itemized data",
      },
      ...(receipt.merchantLocation
        ? [
            {
              id: "location",
              header: "Location",
              body: receipt.merchantLocation,
            },
          ]
        : []),
    ],
    linksModuleData: {
      uris: [
        {
          uri: `${BASE_URL}/receipts/${receipt.id}`,
          description: "View full receipt",
          id: "full-receipt",
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
      value: `${BASE_URL}/receipts/${receipt.id}`,
      alternateText: `Receipt from ${receipt.merchantName}`,
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

/**
 * Load receipt data from database and generate Google Wallet link.
 */
export async function generateGoogleReceiptLinkForId(
  receiptId: string,
  userId: string
): Promise<string> {
  const receipt = await db.receipt.findFirst({
    where: { id: receiptId, userId },
    include: {
      items: {
        select: {
          name: true,
          quantity: true,
          totalPrice: true,
        },
        take: 5,
      },
    },
  });

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  const itemsSummary = receipt.items
    .map(
      (item) =>
        `${item.quantity > 1 ? `${item.quantity}x ` : ""}${item.name}`
    )
    .join(", ");

  return generateGoogleReceiptLink({
    id: receipt.id,
    merchantName: receipt.merchantCanonicalName,
    merchantCategory: receipt.merchantCategory,
    total: receipt.total,
    currency: receipt.currency,
    purchasedAt: receipt.purchasedAt,
    paymentMethod: receipt.paymentMethod,
    cardLast4: receipt.cardLast4,
    itemCount: receipt.items.length,
    itemsSummary,
    merchantLocation: receipt.merchantLocation,
  });
}
