import { db } from "@receipts/db";
import { ApplePassData } from "./apple-pass";

/**
 * Apple Wallet Individual Receipt Pass — generates a per-receipt wallet pass
 * so users can save individual receipts to Apple Wallet.
 *
 * Pass type: generic
 * - Header: merchant name + logo initial
 * - Primary: total amount
 * - Secondary: date + payment method
 * - Auxiliary: item count + category
 * - Back: full line items + store address if available
 * - Colors match merchant category (coffee=brown tint, grocery=green tint, default=brand green)
 */

const PASS_TYPE_ID =
  process.env.APPLE_PASS_TYPE_ID ?? "pass.com.receiptiles.receipts";
const TEAM_ID = process.env.APPLE_TEAM_ID ?? "";
const WEB_SERVICE_URL = "https://receiptiles.com/api/wallet/apple";
const BASE_URL = "https://receiptiles.com";

/**
 * Category-based color schemes for individual receipt passes.
 */
const CATEGORY_COLORS: Record<
  string,
  { backgroundColor: string; foregroundColor: string; labelColor: string }
> = {
  "Coffee & Tea": {
    backgroundColor: "#3E2723",
    foregroundColor: "#EFEBE9",
    labelColor: "#A1887F",
  },
  Coffee: {
    backgroundColor: "#3E2723",
    foregroundColor: "#EFEBE9",
    labelColor: "#A1887F",
  },
  Grocery: {
    backgroundColor: "#1B5E20",
    foregroundColor: "#E8F5E9",
    labelColor: "#81C784",
  },
  Groceries: {
    backgroundColor: "#1B5E20",
    foregroundColor: "#E8F5E9",
    labelColor: "#81C784",
  },
  Restaurant: {
    backgroundColor: "#BF360C",
    foregroundColor: "#FBE9E7",
    labelColor: "#FF8A65",
  },
  "Food & Dining": {
    backgroundColor: "#BF360C",
    foregroundColor: "#FBE9E7",
    labelColor: "#FF8A65",
  },
  Shopping: {
    backgroundColor: "#1A237E",
    foregroundColor: "#E8EAF6",
    labelColor: "#7986CB",
  },
  Electronics: {
    backgroundColor: "#0D47A1",
    foregroundColor: "#E3F2FD",
    labelColor: "#64B5F6",
  },
  Transportation: {
    backgroundColor: "#263238",
    foregroundColor: "#ECEFF1",
    labelColor: "#90A4AE",
  },
  Travel: {
    backgroundColor: "#01579B",
    foregroundColor: "#E1F5FE",
    labelColor: "#4FC3F7",
  },
  Health: {
    backgroundColor: "#004D40",
    foregroundColor: "#E0F2F1",
    labelColor: "#80CBC4",
  },
};

const DEFAULT_COLORS = {
  backgroundColor: "#242D28",
  foregroundColor: "#F7F6F2",
  labelColor: "#82907A",
};

/**
 * Get color scheme based on merchant category.
 */
function getColorsForCategory(category: string): {
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
} {
  return CATEGORY_COLORS[category] ?? DEFAULT_COLORS;
}

/**
 * Format a number as USD currency string.
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
function formatPaymentMethod(method: string, cardLast4?: string | null): string {
  if (cardLast4) return `${method} ****${cardLast4}`;
  if (method === "unknown") return "Not specified";
  return method.charAt(0).toUpperCase() + method.slice(1);
}

/**
 * Generate pass.json for an individual receipt.
 */
export async function generateReceiptPassJson(
  receiptId: string,
  userId: string
): Promise<ApplePassData> {
  const receipt = await db.receipt.findFirst({
    where: { id: receiptId, userId },
    include: {
      items: {
        select: {
          name: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          category: true,
        },
      },
    },
  });

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  const colors = getColorsForCategory(receipt.merchantCategory);
  const serialNumber = `rcpt_single_${receiptId}`;

  // Build line items text for back of pass
  const lineItemsText = receipt.items.length > 0
    ? receipt.items
        .map(
          (item) =>
            `${item.quantity > 1 ? `${item.quantity}x ` : ""}${item.name} — ${formatCurrency(item.totalPrice, receipt.currency)}`
        )
        .join("\n")
    : "No itemized data available";

  // Build receipt details for back
  const detailLines: string[] = [];
  if (receipt.subtotal > 0) detailLines.push(`Subtotal: ${formatCurrency(receipt.subtotal, receipt.currency)}`);
  if (receipt.tax > 0) detailLines.push(`Tax: ${formatCurrency(receipt.tax, receipt.currency)}`);
  if (receipt.tip > 0) detailLines.push(`Tip: ${formatCurrency(receipt.tip, receipt.currency)}`);
  if (receipt.discount > 0) detailLines.push(`Discount: -${formatCurrency(receipt.discount, receipt.currency)}`);
  detailLines.push(`Total: ${formatCurrency(receipt.total, receipt.currency)}`);

  const backFields = [
    {
      key: "items",
      label: "Items",
      value: lineItemsText,
    },
    {
      key: "details",
      label: "Receipt Details",
      value: detailLines.join("\n"),
    },
  ];

  if (receipt.merchantLocation) {
    backFields.push({
      key: "location",
      label: "Store Address",
      value: receipt.merchantLocation,
    });
  }

  backFields.push({
    key: "source",
    label: "Source",
    value: `Captured via ${receipt.source}`,
  });

  backFields.push({
    key: "powered",
    label: "Powered by",
    value: "Receiptiles — Your digital receipt wallet\nhttps://receiptiles.com",
  });

  return {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    serialNumber,
    teamIdentifier: TEAM_ID,
    organizationName: "Receiptiles",
    description: `Receipt from ${receipt.merchantCanonicalName}`,
    authenticationToken: "receipt-pass-static", // Individual receipt passes are static
    webServiceURL: WEB_SERVICE_URL,
    backgroundColor: colors.backgroundColor,
    foregroundColor: colors.foregroundColor,
    labelColor: colors.labelColor,
    logoText: receipt.merchantCanonicalName.charAt(0).toUpperCase(),
    generic: {
      headerFields: [
        {
          key: "merchant",
          label: "Merchant",
          value: receipt.merchantCanonicalName,
        },
      ],
      primaryFields: [
        {
          key: "total",
          label: "Total",
          value: formatCurrency(receipt.total, receipt.currency),
        },
      ],
      secondaryFields: [
        {
          key: "date",
          label: "Date",
          value: formatDate(receipt.purchasedAt),
        },
        {
          key: "payment",
          label: "Payment",
          value: formatPaymentMethod(receipt.paymentMethod, receipt.cardLast4),
        },
      ],
      auxiliaryFields: [
        {
          key: "itemCount",
          label: "Items",
          value: `${receipt.items.length}`,
        },
        {
          key: "category",
          label: "Category",
          value: receipt.merchantCategory,
        },
      ],
      backFields,
    },
    barcodes: [
      {
        message: `${BASE_URL}/receipts/${receiptId}`,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
        altText: `Receipt ${receiptId.slice(0, 8)}`,
      },
    ],
  };
}
