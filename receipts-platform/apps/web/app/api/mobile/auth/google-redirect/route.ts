import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret"
);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL = "https://receipts-platform-revanth-sai-reddy-venumbaka-s-projects.vercel.app";

/**
 * GET /api/mobile/auth/google-redirect
 * Step 1: Redirects user to Google OAuth consent screen
 *
 * GET /api/mobile/auth/google-redirect?code=xxx&state=receipts://auth
 * Step 2: Google redirects back here with auth code, we exchange for tokens
 *         and redirect to the mobile app with the JWT token
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const mobileRedirect = searchParams.get("redirect") || searchParams.get("state") || "receipts://auth";

  // Step 1: No code yet — redirect to Google
  if (!code) {
    const thisUrl = new URL(request.url);
    // Use the canonical domain to ensure redirect_uri matches exactly
    // Must match EXACTLY what's in Google Console authorized redirect URIs
    const callbackUrl = "https://receipts-platform-revanth-sai-reddy-venumbaka-s-projects.vercel.app/api/mobile/auth/google-redirect";

    const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    googleUrl.searchParams.set("redirect_uri", callbackUrl);
    googleUrl.searchParams.set("response_type", "code");
    googleUrl.searchParams.set("scope", "openid profile email");
    googleUrl.searchParams.set("access_type", "offline");
    googleUrl.searchParams.set("state", mobileRedirect);
    googleUrl.searchParams.set("prompt", "select_account");

    return NextResponse.redirect(googleUrl.toString());
  }

  // Step 2: Got code from Google — exchange for tokens
  try {
    const thisUrl = new URL(request.url);
    // Must match EXACTLY what's in Google Console authorized redirect URIs
    const callbackUrl = "https://receipts-platform-revanth-sai-reddy-venumbaka-s-projects.vercel.app/api/mobile/auth/google-redirect";

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error("Google token exchange failed:", errorBody, "redirect_uri used:", callbackUrl);
      return NextResponse.redirect(`${mobileRedirect}?error=token_exchange_failed&detail=${encodeURIComponent(errorBody.slice(0, 200))}`);
    }

    const tokens = await tokenRes.json();

    // Get user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(`${mobileRedirect}?error=userinfo_failed`);
    }

    const googleUser = await userInfoRes.json();
    const email = googleUser.email?.toLowerCase();
    const name = googleUser.name || email.split("@")[0];

    // Find or create user by email (case-insensitive)
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Try case-insensitive search
      user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    }

    if (!user) {
      user = await db.user.create({
        data: { email, name, emailVerified: new Date() },
      });
    } else if (!user.emailVerified) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    // Generate JWT for mobile app
    const token = await new SignJWT({ sub: user.id, email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    // Redirect back to mobile app with token
    return NextResponse.redirect(`${mobileRedirect}?token=${token}`);
  } catch (err) {
    console.error("Google redirect auth error:", err);
    return NextResponse.redirect(`${mobileRedirect}?error=auth_failed`);
  }
}
