import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { redirect } from "next/navigation";

/**
 * GET /api/oauth/authorize
 *
 * OAuth2 Authorization endpoint for the Data API.
 * Third-party apps redirect here to get user consent.
 *
 * Query params:
 *   client_id - The app's client ID
 *   redirect_uri - Where to redirect after consent
 *   scope - Space-separated scopes (receipts.read, spending.read, items.read, merchants.read)
 *   state - Opaque state value passed back to client
 *   response_type - Must be "code"
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    // Redirect to login with return URL
    const returnUrl = req.url;
    return NextResponse.redirect(new URL(`/login?returnTo=${encodeURIComponent(returnUrl)}`, req.url));
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const scope = searchParams.get("scope") ?? "receipts.read";
  const state = searchParams.get("state") ?? "";
  const responseType = searchParams.get("response_type");

  if (!clientId || !redirectUri || responseType !== "code") {
    return NextResponse.json(
      { error: "Missing required params: client_id, redirect_uri, response_type=code" },
      { status: 400 }
    );
  }

  // Validate client_id exists
  const apiKey = await db.dataApiKey.findFirst({
    where: { partnerId: clientId, active: true },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
  }

  // Render consent page (in production this would be a full page component)
  // For now, redirect to consent page with params
  const consentUrl = new URL("/oauth/consent", req.url);
  consentUrl.searchParams.set("client_id", clientId);
  consentUrl.searchParams.set("app_name", apiKey.partnerName);
  consentUrl.searchParams.set("redirect_uri", redirectUri);
  consentUrl.searchParams.set("scope", scope);
  consentUrl.searchParams.set("state", state);

  return NextResponse.redirect(consentUrl);
}
