import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { jwtVerify } from "jose";
import { randomUUID } from "crypto";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret"
);

export interface MCPAuthResult {
  userId: string;
  merchantId?: string;
  scopes: string[];
  appId: string;
  requestId: string;
}

export interface MCPAuthError {
  response: NextResponse;
}

// In-memory rate limiter (per token/key)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, limit: number = 100): boolean {
  const now = Date.now();
  const window = 60_000; // 1 minute window

  const entry = rateLimits.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(identifier, { count: 1, resetAt: now + window });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Create a standard MCP error response with request ID header.
 */
export function mcpError(
  error: string,
  code: string,
  status: number,
  requestId: string
): NextResponse {
  return NextResponse.json(
    { error, code },
    {
      status,
      headers: {
        "x-request-id": requestId,
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Add standard headers to a successful MCP response.
 */
export function mcpResponse(data: unknown, requestId: string): NextResponse {
  return NextResponse.json(data, {
    headers: {
      "x-request-id": requestId,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Validate MCP auth from Bearer token.
 * Supports both:
 *   1. OAuth2 JWT tokens (from /api/oauth/token)
 *   2. API keys (sk_...) for direct access
 *
 * Checks the required scope against the token's granted scopes.
 */
export async function validateMCPAuth(
  req: NextRequest,
  requiredScope: string
): Promise<MCPAuthResult | MCPAuthError> {
  const requestId = randomUUID();
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      response: mcpError(
        "Authorization header with Bearer token required",
        "auth_required",
        401,
        requestId
      ),
    };
  }

  const token = authHeader.slice(7);

  // Check rate limit on the raw token (first 16 chars as identifier)
  const rateLimitKey = token.slice(0, 16);
  if (!checkRateLimit(rateLimitKey, 100)) {
    return {
      response: mcpError(
        "Rate limit exceeded. Max 100 requests per minute.",
        "rate_limited",
        429,
        requestId
      ),
    };
  }

  // Path 1: API Key (sk_ prefix)
  if (token.startsWith("sk_")) {
    const key = await db.apiKey.findUnique({ where: { key: token } });

    if (!key || !key.isActive) {
      return {
        response: mcpError(
          "Invalid or inactive API key",
          "invalid_token",
          401,
          requestId
        ),
      };
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      return {
        response: mcpError(
          "API key has expired",
          "token_expired",
          401,
          requestId
        ),
      };
    }

    // API keys have full access - no scope restriction
    // Update last used (fire and forget)
    db.apiKey
      .update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return {
      userId: key.userId,
      scopes: [
        "receipts:read",
        "receipts:write",
        "analytics:read",
        "merchant:read",
        "merchant:analytics",
        "profile:read",
      ],
      appId: "direct",
      requestId,
    };
  }

  // Path 2: OAuth2 JWT token
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sub = payload.sub as string | undefined;
    const scopes = payload.scopes as string[] | undefined;
    const appId = payload.appId as string | undefined;

    if (!sub || !scopes || !appId) {
      return {
        response: mcpError(
          "Malformed token payload",
          "invalid_token",
          401,
          requestId
        ),
      };
    }

    // Check if token type is refresh (not allowed for API calls)
    if ((payload as Record<string, unknown>).type === "refresh") {
      return {
        response: mcpError(
          "Refresh tokens cannot be used for API access",
          "invalid_token",
          401,
          requestId
        ),
      };
    }

    // Check required scope
    // Map scope formats: "receipts.read" -> "receipts:read"
    const normalizedScopes = scopes.map((s) => s.replace(".", ":"));
    const normalizedRequired = requiredScope.replace(".", ":");

    if (!normalizedScopes.includes(normalizedRequired)) {
      return {
        response: mcpError(
          `Insufficient scope. Required: ${requiredScope}`,
          "insufficient_scope",
          403,
          requestId
        ),
      };
    }

    // Check if grant is still active
    const grant = await db.dataApiGrant.findFirst({
      where: {
        appId,
        wallet: { userId: sub },
        revokedAt: null,
      },
    });

    if (!grant) {
      return {
        response: mcpError(
          "Grant has been revoked",
          "grant_revoked",
          403,
          requestId
        ),
      };
    }

    // Resolve merchantId if the user has a merchant connection
    const merchantConnection = await db.merchantConnection.findFirst({
      where: { userId: sub, isActive: true },
    });

    return {
      userId: sub,
      merchantId: merchantConnection?.merchantId,
      scopes: normalizedScopes,
      appId,
      requestId,
    };
  } catch (err) {
    // JWT verification failed
    const message =
      err instanceof Error && err.message.includes("expired")
        ? "Token has expired"
        : "Invalid token";
    const code =
      err instanceof Error && err.message.includes("expired")
        ? "token_expired"
        : "invalid_token";

    return {
      response: mcpError(message, code, 401, requestId),
    };
  }
}

/**
 * Type guard to check if the auth result is an error.
 */
export function isMCPAuthError(
  result: MCPAuthResult | MCPAuthError
): result is MCPAuthError {
  return "response" in result;
}
