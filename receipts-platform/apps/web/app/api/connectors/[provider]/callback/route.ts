import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { getConnector } from "@/lib/connectors";
import { registerWebhook } from "@/lib/connectors/webhooks";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { provider } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  // Square may redirect with an error instead of a code
  if (errorParam) {
    console.error(`[${provider}] OAuth denied:`, errorParam, errorDesc);
    const msg = encodeURIComponent(errorDesc || errorParam);
    return NextResponse.redirect(new URL(`/email?error=${msg}`, request.url));
  }

  if (!code) {
    console.error(`[${provider}] No authorization code in callback`);
    return NextResponse.redirect(new URL("/email?error=No+authorization+code+received", request.url));
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/connectors/${provider}/callback`;
  console.log(`[${provider}] Exchanging code, redirect_uri: ${redirectUri}`);

  try {
    const connector = getConnector(provider);
    let credentials;
    try {
      credentials = await connector.exchangeCode(code, redirectUri);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${provider}] Token exchange failed:`, msg);
      return NextResponse.redirect(new URL(`/email?error=${encodeURIComponent(`Token exchange failed: ${msg}`)}`, request.url));
    }

    console.log(`[${provider}] Token exchange OK, merchantId: ${credentials.merchantId}`);

    // Fetch merchant name
    let merchantName: string | undefined;
    try {
      merchantName = await fetchMerchantName(provider, credentials.accessToken, credentials.merchantId);
      console.log(`[${provider}] Merchant name: ${merchantName}`);
    } catch (err) {
      console.warn(`[${provider}] Merchant name fetch failed:`, err);
    }

    // Save connection
    try {
      await db.merchantConnection.upsert({
        where: {
          userId_provider_merchantId: {
            userId: session.user.id,
            provider,
            merchantId: credentials.merchantId,
          },
        },
        update: {
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          expiresAt: credentials.expiresAt,
          locationId: credentials.locationId,
          merchantName,
          metadata: credentials.metadata ?? undefined,
          isActive: true,
        },
        create: {
          userId: session.user.id,
          provider,
          merchantId: credentials.merchantId,
          merchantName,
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken ?? "",
          expiresAt: credentials.expiresAt,
          locationId: credentials.locationId,
          metadata: credentials.metadata ?? undefined,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${provider}] DB save failed:`, msg);
      return NextResponse.redirect(new URL(`/email?error=${encodeURIComponent(`Save failed: ${msg}`)}`, request.url));
    }

    // Register webhook
    try {
      const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/${provider}`;
      await registerWebhook(provider, credentials.accessToken, webhookUrl, credentials.merchantId);
      console.log(`[${provider}] Webhook registered`);
    } catch (err) {
      console.warn(`[${provider}] Webhook registration failed (non-blocking):`, err);
    }

    return NextResponse.redirect(new URL(`/email?connected=${provider}`, request.url));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[${provider}] Unexpected error:`, msg);
    return NextResponse.redirect(new URL(`/email?error=${encodeURIComponent(msg)}`, request.url));
  }
}

async function fetchMerchantName(provider: string, accessToken: string, merchantId: string): Promise<string | undefined> {
  if (provider === "square") {
    const res = await fetch("https://connect.squareup.com/v2/merchants/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": "2024-01-18",
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.merchant?.business_name;
    }
    console.warn(`[square] Merchant fetch failed: ${res.status} ${await res.text()}`);
  }
  if (provider === "clover") {
    const res = await fetch(`https://api.clover.com/v3/merchants/${merchantId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      return data.name;
    }
  }
  return undefined;
}
