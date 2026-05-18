import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "./logger";

type RouteHandler = (
  req: NextRequest,
  context?: unknown
) => Promise<NextResponse | Response>;

/**
 * Wraps a Next.js App Router route handler with structured request logging.
 *
 * Logs method, path, status code, duration (ms), and a generated requestId
 * for every request. The requestId is also set as an `x-request-id` response header.
 *
 * @example
 * export const GET = withRequestLogging(async (req) => {
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withRequestLogging(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: unknown) => {
    const requestId = crypto.randomUUID();
    const start = performance.now();
    const { method } = req;
    const path = new URL(req.url).pathname;

    const log = createLogger({ requestId, method, path });

    log.info("Incoming request");

    let response: NextResponse | Response;
    try {
      response = await handler(req, context);
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      log.error({ duration, error }, "Unhandled error in route handler");
      throw error;
    }

    const duration = Math.round(performance.now() - start);
    const status = response.status;

    if (status >= 500) {
      log.error({ status, duration }, "Request completed with server error");
    } else if (status >= 400) {
      log.warn({ status, duration }, "Request completed with client error");
    } else {
      log.info({ status, duration }, "Request completed");
    }

    // Attach requestId header to response
    if (response instanceof NextResponse) {
      response.headers.set("x-request-id", requestId);
    }

    return response;
  };
}
