export type ReceiptSource = "upload" | "email" | "pos" | "processor" | "manual";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Merchant {
  rawName: string;
  canonicalName: string;
  category: string;
  location: string | null;
}

export interface PurchaseDetails {
  purchasedAt: string;
  currency: string;
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  fees: number;
  total: number;
}

export interface PaymentDetails {
  method: string;
  cardId: string | null;
  cardLast4: string | null;
  walletType: string | null;
  entryMode: string | null;
}

export interface ReceiptItem {
  id: string;
  rawName: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
}

export interface ReceiptMetadata {
  confidence: number;
  requiresReview: boolean;
  ocrText?: string;
  rawParseResult?: unknown;
}

export interface CanonicalReceipt {
  id: string;
  userId: string;
  source: ReceiptSource;
  merchant: Merchant;
  purchase: PurchaseDetails;
  payment: PaymentDetails;
  items: ReceiptItem[];
  metadata: ReceiptMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface UserCard {
  id: string;
  userId: string;
  name: string;
  last4: string;
  network: "visa" | "mastercard" | "amex" | "discover" | "other";
  issuer: string | null;
  isDefault: boolean;
}

export interface CardRewardRule {
  id: string;
  cardId: string;
  category: string | null;
  merchantName: string | null;
  rewardRate: number;
  rewardType: "cashback" | "points" | "miles";
  multiplier: number;
}

export interface CardRecommendation {
  cardId: string;
  cardName: string;
  rewardRate: number;
  rewardType: string;
  estimatedReward: number;
  reason: string;
}
