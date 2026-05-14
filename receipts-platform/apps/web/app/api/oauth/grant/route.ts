import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { nanoid } from "nanoid";

/**
 * POST /api/oauth/grant
 * Creates an OAuth grant (called from consent form)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId, scopes, redirectUri } = await req.json();
  const userId = session.user.id;

  // Get or create wallet
  let wallet = await db.receiptWallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await db.receiptWallet.create({
      data: {
        userId,
        walletId: `rw_${nanoid(16)}`,
        displayName: session.user.name ?? session.user.email?.split("@")[0],
      },
    });
  }

  // Get app name
  const apiKey = await db.dataApiKey.findFirst({
    where: { partnerId: clientId, active: true },
  });

  // Create or update grant
  const grant = await db.dataApiGrant.upsert({
    where: { walletId_appId: { walletId: wallet.id, appId: clientId } },
    create: {
      walletId: wallet.id,
      appId: clientId,
      appName: apiKey?.partnerName ?? "Unknown App",
      scopes,
      grantedAt: new Date(),
    },
    update: {
      scopes,
      revokedAt: null, // Re-enable if previously revoked
      grantedAt: new Date(),
    },
  });

  // Generate authorization code (short-lived)
  const code = `rc_${nanoid(32)}`;

  // In production, store this code with expiry in Redis/DB
  // For now, the grant itself serves as validation
  // The token endpoint will verify the most recent grant

  return NextResponse.json({ code, grantId: grant.id });
}
