import type { ListReceiptsParams, PaginatedResponse, Receipt } from "../types";

type RequestFn = (method: string, path: string, params?: Record<string, unknown>) => Promise<unknown>;

export class ReceiptsResource {
  private request: RequestFn;

  /** @internal */
  constructor(request: RequestFn) {
    this.request = request;
  }

  /**
   * List receipts with optional filtering and pagination.
   */
  async list(params?: ListReceiptsParams): Promise<PaginatedResponse<Receipt>> {
    return this.request("GET", "/api/v1/receipts", params as Record<string, unknown>) as Promise<
      PaginatedResponse<Receipt>
    >;
  }

  /**
   * Get a single receipt by ID.
   */
  async get(id: string): Promise<Receipt> {
    return this.request("GET", `/api/v1/receipts/${id}`) as Promise<Receipt>;
  }
}
