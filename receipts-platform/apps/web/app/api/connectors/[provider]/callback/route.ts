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

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  try {
    const connector = getConnector(provider);
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/connectors/${provider}/callback`;
    const credentials = await connector.exchangeCode(code, redirectUri);

    // Fetch merchant name from the POS API
    let merchantName: string | undefined;
    try {
      merchantName = await fetchMerchantName(provider, credentials.accessToken, credentials.merchantId);
    } catch {
      // Non-critical, continue without name
    }

    const connection = await db.merchantConnection.upsert({
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
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        locationId: credentials.locationId,
        metadata: credentials.metadata ?? undefined,
      },
    });

    // Register webhook for automatic receipt delivery
    try {
      const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/${provider}`;
      await registerWebhook(provider, credentials.accessToken, webhookUrl, credentials.merchantId);
      console.log(`[POS] Webhook registered for ${provider}:${credentials.merchantId}`);
    } catch (err) {
      console.error(`[POS] Webhook registration failed for ${provider}:`, err);
    }

    return NextResponse.redirect(new URL("/email?connected=true", request.url));
  } catch (error) {
    console.error(`${provider} OAuth error:`, error);
    return NextResponse.redirect(new URL("/email?error=oauth_failed", request.url));
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
