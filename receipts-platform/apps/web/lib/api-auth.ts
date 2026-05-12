import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";

interface ApiAuthResult {
  userId: string;
  keyId: string;
}

// Simple in-memory rate limiter (per API key)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(keyId: string, limit: number): boolean {
  const now = Date.now();
  const window = 60_000; // 1 minute window

  const entry = rateLimits.get(keyId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(keyId, { count: 1, resetAt: now + window });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Authenticate an API v1 request using an API key.
 * Returns userId + keyId or a NextResponse error.
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<ApiAuthResult | NextResponse> {
  const authHeader = request.headers.get("authorization");
  const queryKey = request.nextUrl.searchParams.get("api_key");
  const apiKey = authHeader?.startsWith("Bearer sk_")
    ? authHeader.slice(7)
    : queryKey;

  if (!apiKey) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "API key required. Pass via Authorization: Bearer sk_..." } },
      { status: 401 }
    );
  }

  const key = await db.apiKey.findUnique({ where: { key: apiKey } });

  if (!key || !key.isActive) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid or inactive API key." } },
      { status: 401 }
    );
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    return NextResponse.json(
      { error: { code: "expired", message: "API key has expired." } },
      { status: 401 }
    );
  }

  // Rate limiting
  if (!checkRateLimit(key.id, key.rateLimit)) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: `Rate limit exceeded. Max ${key.rateLimit} requests per minute.` } },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Update last used (fire and forget)
  db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { userId: key.userId, keyId: key.id };
}
