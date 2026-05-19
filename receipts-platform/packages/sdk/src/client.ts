import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ReceiptilesError,
} from "./errors";
import { AnalyticsResource } from "./resources/analytics";
import { MerchantResource } from "./resources/merchant";
import { ReceiptsResource } from "./resources/receipts";
import type { ErrorResponseBody, ReceiptilesClientOptions } from "./types";

const DEFAULT_BASE_URL = "https://receiptiles.com";
const DEFAULT_TIMEOUT = 30_000;

export class ReceiptilesClient {
  private apiKey?: string;
  private accessToken?: string;
  private baseUrl: string;
  private timeout: number;

  /** Receipts resource for listing and retrieving receipts. */
  readonly receipts: ReceiptsResource;
  /** Analytics resource for spending insights. */
  readonly analytics: AnalyticsResource;
  /** Merchant resource for merchant-side operations. */
  readonly merchant: MerchantResource;

  constructor(options: ReceiptilesClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.accessToken = options.accessToken;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;

    if (!this.apiKey && !this.accessToken) {
      throw new Error(
        "ReceiptilesClient requires either an apiKey or accessToken. " +
          "Pass one in the constructor options."
      );
    }

    const request = this.request.bind(this);
    this.receipts = new ReceiptsResource(request);
    this.analytics = new AnalyticsResource(request);
    this.merchant = new MerchantResource(request);
  }

  /**
   * Internal request method used by all resources.
   */
  private async request(
    method: string,
    path: string,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    let url = `${this.baseUrl}${path}`;

    // For GET requests, append params as query string
    if (method === "GET" && params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += `?${qs}`;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "@receiptiles/sdk/0.1.0",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    } else if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      // For non-GET requests, include body
      if (method !== "GET" && params) {
        fetchOptions.body = JSON.stringify(params);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ReceiptilesError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ReceiptilesError(
          `Request timed out after ${this.timeout}ms`,
          0,
          "timeout",
          "unknown"
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse error response and throw appropriate error class.
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let body: ErrorResponseBody | undefined;
    try {
      body = (await response.json()) as ErrorResponseBody;
    } catch {
      // Response may not be JSON
    }

    const message = body?.error?.message || response.statusText || "Unknown error";
    const code = body?.error?.code || "unknown";
    const requestId = body?.error?.requestId || response.headers.get("x-request-id") || "unknown";

    switch (response.status) {
      case 401:
        throw new AuthenticationError(message, code, requestId);
      case 404:
        throw new NotFoundError(message, code, requestId);
      case 429: {
        const retryAfter = parseInt(response.headers.get("retry-after") || "60", 10);
        throw new RateLimitError(message, code, requestId, retryAfter);
      }
      default:
        throw new ReceiptilesError(message, response.status, code, requestId);
    }
  }
}
