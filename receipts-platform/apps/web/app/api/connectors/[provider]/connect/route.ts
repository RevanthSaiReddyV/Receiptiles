import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

  try {
    const connector = getConnector(provider);
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/connectors/${provider}/callback`;
    // For POS connectors, merchantId can be passed as query param or left as placeholder
    const merchantId = request.nextUrl.searchParams.get("merchantId") ?? "";
    const authUrl = connector.getAuthUrl(merchantId, redirectUri);

    return NextResponse.redirect(authUrl);
  } catch {
    return NextResponse.redirect(
      new URL(`/settings?error=unknown_provider`, request.url)
    );
  }
}
