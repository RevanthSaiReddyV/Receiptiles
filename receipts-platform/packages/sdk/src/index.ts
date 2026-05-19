// Main client
export { ReceiptilesClient } from "./client";

// OAuth2 helpers
export { getAuthorizationUrl, exchangeCode, refreshToken } from "./auth";

// Error classes
export {
  ReceiptilesError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
} from "./errors";

// Resource classes
export { ReceiptsResource } from "./resources/receipts";
export { AnalyticsResource } from "./resources/analytics";
export { MerchantResource } from "./resources/merchant";

// Types
export type {
  ReceiptilesClientOptions,
  PaginatedResponse,
  Receipt,
  ReceiptItem,
  SpendingAnalytics,
  SpendingByGroup,
  MerchantReceipt,
  MerchantAnalytics,
  TokenResponse,
  AuthorizationUrlOptions,
  ExchangeCodeOptions,
  RefreshTokenOptions,
  ListReceiptsParams,
  SpendingParams,
  MerchantReceiptsParams,
  MerchantAnalyticsParams,
  ErrorResponseBody,
} from "./types";
