import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { getConnector } from "@/lib/connectors";

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
        metadata: credentials.metadata ?? undefined,
        isActive: true,
      },
      create: {
        userId: session.user.id,
        provider,
        merchantId: credentials.merchantId,
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        locationId: credentials.locationId,
        metadata: credentials.metadata ?? undefined,
      },
    });

    return NextResponse.redirect(new URL("/settings?connected=true", request.url));
  } catch (error) {
    console.error(`${provider} OAuth error:`, error);
    return NextResponse.redirect(new URL("/settings?error=oauth_failed", request.url));
  }
}
