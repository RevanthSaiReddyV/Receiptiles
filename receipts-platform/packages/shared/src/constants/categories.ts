export const RECEIPT_CATEGORIES = [
  "Groceries",
  "Dining",
  "Shopping",
  "Transportation",
  "Travel",
  "Entertainment",
  "Healthcare",
  "Utilities",
  "Subscriptions",
  "Gas & Fuel",
  "Home & Garden",
  "Personal Care",
  "Education",
  "Gifts & Donations",
  "Business",
  "Uncategorized",
] as const;

export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];

export const CARD_NETWORKS = [
  "visa",
  "mastercard",
  "amex",
  "discover",
  "other",
] as const;

export const REWARD_TYPES = ["cashback", "points", "miles"] as const;

export const JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
