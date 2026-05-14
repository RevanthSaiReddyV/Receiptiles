import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const REDIRECT_URI = process.env.GMAIL_MOBILE_REDIRECT_URI ?? "receipts://gmail-callback";

/**
 * GET /api/mobile/gmail/auth-url
 * Returns the Google OAuth URL for Gmail access
 */
export async function GET() {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: userId, // Pass userId in state for verification
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  return NextResponse.json({ url });
}
