import type { SpendingAnalytics, SpendingParams } from "../types";

type RequestFn = (method: string, path: string, params?: Record<string, unknown>) => Promise<unknown>;

export class AnalyticsResource {
  private request: RequestFn;

  /** @internal */
  constructor(request: RequestFn) {
    this.request = request;
  }

  /**
   * Get spending analytics for the authenticated user.
   */
  async spending(params?: SpendingParams): Promise<SpendingAnalytics> {
    return this.request(
      "GET",
      "/api/v1/analytics/spending",
      params as Record<string, unknown>
    ) as Promise<SpendingAnalytics>;
  }
}
