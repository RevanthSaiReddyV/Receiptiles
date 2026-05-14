import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "fallback-secret");

/**
 * POST /api/oauth/token
 *
 * OAuth2 Token endpoint - exchanges authorization code for access token.
 * Used by third-party apps after user consent.
 *
 * Body (form-encoded or JSON):
 *   grant_type: "authorization_code"
 *   code: The authorization code from /authorize
 *   client_id: App's client ID
 *   client_secret: App's secret key
 *   redirect_uri: Must match the one used in /authorize
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, string>;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    body = Object.fromEntries(new URLSearchParams(text));
  } else {
    body = await req.json();
  }

  const { grant_type, code, client_id, client_secret, redirect_uri } = body;

  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }

  if (!code || !client_id || !client_secret) {
    return NextResponse.json({ error: "invalid_request", error_description: "Missing required params" }, { status: 400 });
  }

  // Validate client credentials
  const apiKey = await db.dataApiKey.findFirst({
    where: { partnerId: client_id, key: client_secret, active: true },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  // Look up the authorization code (stored as a temporary grant)
  // In production, use a proper OAuth code store with expiry
  const grant = await db.dataApiGrant.findFirst({
    where: {
      appId: client_id,
      revokedAt: null,
    },
    include: { wallet: true },
    orderBy: { grantedAt: "desc" },
  });

  if (!grant || !grant.wallet) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  // Generate access token (JWT with scopes)
  const accessToken = await new SignJWT({
    sub: grant.wallet.userId,
    appId: client_id,
    scopes: grant.scopes,
    walletId: grant.wallet.walletId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(JWT_SECRET);

  // Generate refresh token
  const refreshToken = await new SignJWT({
    sub: grant.wallet.userId,
    appId: client_id,
    type: "refresh",
    grantId: grant.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  // Update grant with last used
  await db.dataApiGrant.update({
    where: { id: grant.id },
    data: { lastUsedAt: new Date() },
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: grant.scopes.join(" "),
  });
}
