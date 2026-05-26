import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CALLBACK_URL = "https://receipts-platform-revanth-sai-reddy-venumbaka-s-projects.vercel.app/api/mobile/gmail/redirect";

/**
 * GET /api/mobile/gmail/redirect
 * Step 1 (no code): Redirect to Google OAuth for Gmail access
 * Step 2 (with code): Redirect back to app with the code
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "receipts://gmail-callback";

  if (!code) {
    // Step 1: Redirect to Google OAuth
    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  // Step 2: Got code — redirect back to app with the code
  return NextResponse.redirect(`${state}?code=${code}`);
}
