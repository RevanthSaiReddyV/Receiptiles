// ─── Client Options ──────────────────────────────────────────────────────────

export interface ReceiptilesClientOptions {
  /** Direct API key (sk_...) */
  apiKey?: string;
  /** OAuth2 access token */
  accessToken?: string;
  /** Base URL for the API. Default: https://receiptiles.com */
  baseUrl?: string;
  /** Request timeout in milliseconds. Default: 30000 */
  timeout?: number;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// ─── Receipt Types ───────────────────────────────────────────────────────────

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  /** Price in cents */
  unitPrice: number;
  /** Total for this line item in cents */
  totalPrice: number;
  category?: string;
  sku?: string;
}

export interface Receipt {
  id: string;
  /** Canonical merchant name */
  merchant: string;
  /** ISO 8601 date string */
  purchasedAt: string;
  /** Total amount in cents */
  total: number;
  /** Subtotal in cents */
  subtotal?: number;
  /** Tax in cents */
  tax?: number;
  /** Tip in cents */
  tip?: number;
  /** ISO 4217 currency code */
  currency: string;
  items: ReceiptItem[];
  /** Source of the receipt (email, upload, pos, connector) */
  source: string;
  /** ISO 8601 date string */
  createdAt: string;
  /** ISO 8601 date string */
  updatedAt: string;
}

// ─── Analytics Types ─────────────────────────────────────────────────────────

export interface SpendingByGroup {
  name: string;
  /** Total spending in cents */
  total: number;
  /** Number of transactions */
  count: number;
  /** Percentage of total spending */
  percentage: number;
}

export interface SpendingAnalytics {
  /** Total spending in cents for the period */
  totalSpending: number;
  /** Number of transactions */
  transactionCount: number;
  /** Average transaction amount in cents */
  averageTransaction: number;
  /** Spending grouped by the requested dimension */
  groups: SpendingByGroup[];
  /** Period start (ISO 8601) */
  periodStart: string;
  /** Period end (ISO 8601) */
  periodEnd: string;
}

// ─── Merchant Types ──────────────────────────────────────────────────────────

export interface MerchantReceipt {
  id: string;
  /** Customer identifier (anonymized) */
  customerId?: string;
  /** ISO 8601 date string */
  purchasedAt: string;
  /** Total amount in cents */
  total: number;
  /** ISO 4217 currency code */
  currency: string;
  items: ReceiptItem[];
  /** ISO 8601 date string */
  createdAt: string;
}

export interface MerchantAnalytics {
  /** Total revenue in cents for the period */
  totalRevenue: number;
  /** Number of transactions */
  transactionCount: number;
  /** Average order value in cents */
  averageOrderValue: number;
  /** Unique customers */
  uniqueCustomers: number;
  /** Revenue by day */
  revenueByDay: Array<{
    /** ISO 8601 date string */
    date: string;
    /** Revenue in cents */
    revenue: number;
    /** Number of transactions */
    count: number;
  }>;
  /** Period start (ISO 8601) */
  periodStart: string;
  /** Period end (ISO 8601) */
  periodEnd: string;
}

// ─── Auth Types ──────────────────────────────────────────────────────────────

export interface AuthorizationUrlOptions {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state?: string;
}

export interface ExchangeCodeOptions {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export interface RefreshTokenOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  /** Expires in seconds */
  expiresIn: number;
  scope: string;
}

// ─── Request Param Types ─────────────────────────────────────────────────────

export interface ListReceiptsParams {
  limit?: number;
  offset?: number;
  merchant?: string;
  /** ISO 8601 date string */
  dateFrom?: string;
  /** ISO 8601 date string */
  dateTo?: string;
  /** Minimum amount in cents */
  minAmount?: number;
  /** Maximum amount in cents */
  maxAmount?: number;
}

export interface SpendingParams {
  period?: "week" | "month" | "year";
  groupBy?: "merchant" | "category" | "day";
}

export interface MerchantReceiptsParams {
  limit?: number;
  offset?: number;
  /** ISO 8601 date string */
  dateFrom?: string;
  /** ISO 8601 date string */
  dateTo?: string;
}

export interface MerchantAnalyticsParams {
  period?: "week" | "month" | "year";
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}
