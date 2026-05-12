import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { scanEmailsForReceipts } from "@/lib/email/scanner";
import { waitUntil } from "@vercel/functions";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const userId = request.nextUrl.searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=missing_params`
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/email/callback`,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[Email Callback] Token exchange failed:", errBody);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?error=token_exchange`
      );
    }

    const tokens = await tokenRes.json();

    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    const profile = await profileRes.json();
    const email = profile.email as string;

    await db.emailConnection.upsert({
      where: { userId_email: { userId, email } },
      create: {
        userId,
        email,
        provider: "gmail",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true,
      },
    });

    console.log(`[Email Callback] Connected ${email} for user ${userId}, starting scan...`);

    waitUntil(
      scanEmailsForReceipts(userId)
        .then((count) => console.log(`[Email Scan] Imported ${count} receipts for ${email}`))
        .catch((err) => console.error(`[Email Scan] Failed for ${email}:`, err))
    );

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?success=email_connected`
    );
  } catch (err) {
    console.error("[Email Callback] Unexpected error:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?error=unknown`
    );
  }
}
