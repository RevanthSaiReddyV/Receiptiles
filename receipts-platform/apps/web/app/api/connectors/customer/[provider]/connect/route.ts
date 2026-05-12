import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCustomerConnector } from "@/lib/connectors/customer";

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
    const connector = getCustomerConnector(provider);
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/connectors/customer/${provider}/callback`;
    const authUrl = connector.getAuthUrl(redirectUri, session.user.id);

    return NextResponse.redirect(authUrl);
  } catch {
    return NextResponse.redirect(
      new URL(`/settings?error=unknown_provider`, request.url)
    );
  }
}
