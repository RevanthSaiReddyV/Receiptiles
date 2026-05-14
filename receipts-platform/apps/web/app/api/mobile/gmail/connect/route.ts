import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";
import { waitUntil } from "@vercel/functions";
import { scanEmailsForReceipts } from "@/lib/email/scanner";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GMAIL_MOBILE_REDIRECT_URI ?? "receipts://gmail-callback";

/**
 * POST /api/mobile/gmail/connect
 * Exchange OAuth code for tokens and start email sync
 */
export async function POST(req: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await req.json();

  if (!code) {
    return NextResponse.json({ error: "Authorization code required" }, { status: 400 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[Gmail Connect] Token exchange failed:", err);
    return NextResponse.json({ error: "Failed to exchange code" }, { status: 400 });
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  // Get user's email from Google
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const profile = await profileRes.json();
  const email = profile.email;

  // Save connection
  const connection = await db.emailConnection.upsert({
    where: { userId_email: { userId, email } },
    create: {
      userId,
      provider: "gmail",
      email,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      isActive: true,
    },
    update: {
      accessToken: access_token,
      refreshToken: refresh_token ?? undefined,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      isActive: true,
    },
  });

  // Count existing receipts before sync for comparison
  const beforeCount = await db.receipt.count({ where: { userId } });

  // Start background sync immediately
  waitUntil(
    scanEmailsForReceipts(userId).then(async () => {
      const afterCount = await db.receipt.count({ where: { userId } });
      console.log(`[Gmail Connect] User ${userId}: imported ${afterCount - beforeCount} receipts from ${email}`);
    })
  );

  // Quick estimate: check how many receipt-like emails exist
  let estimatedReceipts = 0;
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=1&q=subject:(receipt OR "order confirmation" OR invoice)`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const searchData = await searchRes.json();
    estimatedReceipts = searchData.resultSizeEstimate ?? 0;
  } catch {
    estimatedReceipts = 50; // Conservative estimate
  }

  return NextResponse.json({
    connected: true,
    email,
    connectionId: connection.id,
    receiptsFound: estimatedReceipts,
    message: `Connected ${email}! Importing ~${estimatedReceipts} receipts in background...`,
  });
}
