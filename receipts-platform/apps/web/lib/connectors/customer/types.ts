import type { CanonicalReceipt } from "@receipts/shared";

export interface CustomerConnector {
  id: string;
  name: string;
  description: string;
  icon: string;
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<CustomerCredentials>;
  refreshToken(credentials: CustomerCredentials): Promise<CustomerCredentials>;
  fetchTransactions(
    credentials: CustomerCredentials,
    options: FetchTransactionsOptions
  ): Promise<CustomerTransaction[]>;
  normalizeTransaction(
    transaction: CustomerTransaction
  ): Omit<CanonicalReceipt, "id" | "userId" | "createdAt" | "updatedAt">;
}

export interface CustomerCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  accountId: string;
  email?: string;
  metadata?: Record<string, string>;
}

export interface FetchTransactionsOptions {
  since?: Date;
  until?: Date;
  limit?: number;
  cursor?: string;
}

export interface CustomerTransaction {
  id: string;
  provider: string;
  rawData: unknown;
  merchantName: string;
  merchantLocation?: string;
  items: CustomerTransactionItem[];
  subtotal: number;
  tax: number;
  tip: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  cardLast4?: string;
  status: "completed" | "pending" | "refunded";
  transactedAt: Date;
}

export interface CustomerTransactionItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}
