import type {
  MerchantAnalytics,
  MerchantAnalyticsParams,
  MerchantReceipt,
  MerchantReceiptsParams,
  PaginatedResponse,
} from "../types";

type RequestFn = (method: string, path: string, params?: Record<string, unknown>) => Promise<unknown>;

export class MerchantResource {
  private request: RequestFn;

  /** @internal */
  constructor(request: RequestFn) {
    this.request = request;
  }

  /**
   * List receipts for the authenticated merchant.
   */
  async receipts(params?: MerchantReceiptsParams): Promise<PaginatedResponse<MerchantReceipt>> {
    return this.request(
      "GET",
      "/api/v1/merchant/receipts",
      params as Record<string, unknown>
    ) as Promise<PaginatedResponse<MerchantReceipt>>;
  }

  /**
   * Get analytics for the authenticated merchant.
   */
  async analytics(params?: MerchantAnalyticsParams): Promise<MerchantAnalytics> {
    return this.request(
      "GET",
      "/api/v1/merchant/analytics",
      params as Record<string, unknown>
    ) as Promise<MerchantAnalytics>;
  }
}
