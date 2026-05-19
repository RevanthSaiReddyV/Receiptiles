/**
 * Base error class for all Receiptiles API errors.
 */
export class ReceiptilesError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** Machine-readable error code */
  readonly code: string;
  /** Unique request ID for support reference */
  readonly requestId: string;

  constructor(message: string, status: number, code: string, requestId: string) {
    super(message);
    this.name = "ReceiptilesError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/**
 * Thrown when authentication fails (401).
 * Invalid or expired API key / access token.
 */
export class AuthenticationError extends ReceiptilesError {
  constructor(message: string, code: string, requestId: string) {
    super(message, 401, code, requestId);
    this.name = "AuthenticationError";
  }
}

/**
 * Thrown when the rate limit is exceeded (429).
 */
export class RateLimitError extends ReceiptilesError {
  /** Number of seconds to wait before retrying */
  readonly retryAfter: number;

  constructor(message: string, code: string, requestId: string, retryAfter: number) {
    super(message, 429, code, requestId);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when a resource is not found (404).
 */
export class NotFoundError extends ReceiptilesError {
  constructor(message: string, code: string, requestId: string) {
    super(message, 404, code, requestId);
    this.name = "NotFoundError";
  }
}
