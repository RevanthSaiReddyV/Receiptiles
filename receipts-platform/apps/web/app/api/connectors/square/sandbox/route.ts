import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

/**
 * GET /api/connectors/square/sandbox
 *
 * Quick-connect using Square sandbox test account.
 * Only works when SQUARE_APP_ID starts with "sandbox-".
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = process.env.SQUARE_APP_ID;
  if (!appId?.startsWith("sandbox-")) {
    return NextResponse.json({ error: "Not in sandbox mode" }, { status: 400 });
  }

  const sandboxToken = process.env.SQUARE_APP_SECRET!;

  // Fetch sandbox merchant info
  let merchantName = "Square Sandbox Merchant";
  let merchantId = "sandbox-merchant";
  try {
    const res = await fetch("https://connect.squareupsandbox.com/v2/merchants/me", {
      headers: {
        Authorization: `Bearer ${sandboxToken}`,
        "Square-Version": "2024-01-18",
      },
    });
    if (res.ok) {
      const data = await res.json();
      merchantName = data.merchant?.business_name ?? merchantName;
      merchantId = data.merchant?.id ?? merchantId;
    }
  } catch {
    // Use defaults
  }

  // Save connection
  await db.merchantConnection.upsert({
    where: {
      userId_provider_merchantId: {
        userId: session.user.id,
        provider: "square",
        merchantId,
      },
    },
    update: {
      accessToken: sandboxToken,
      merchantName,
      isActive: true,
    },
    create: {
      userId: session.user.id,
      provider: "square",
      merchantId,
      merchantName,
      accessToken: sandboxToken,
      refreshToken: "",
    },
  });

  console.log(`[Square Sandbox] Connected ${merchantName} for user ${session.user.id}`);

  return NextResponse.redirect(new URL("/email?connected=true", process.env.NEXTAUTH_URL!));
}
