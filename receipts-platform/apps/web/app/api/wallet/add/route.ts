import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import {
  getOrCreateWalletPass,
  generateMasterPassJson,
} from "@/lib/wallet/apple-pass";
import {
  getOrCreateGoogleWalletPass,
  generateGooglePassObject,
} from "@/lib/wallet/google-pass";
import { generateGoogleWalletLink } from "@/lib/wallet/google-wallet";

/**
 * GET /api/wallet/add
 * Check if the user already has an active wallet pass.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingPass = await db.walletPass.findFirst({
    where: { userId: session.user.id, isActive: true },
  });

  return NextResponse.json({
    hasPass: !!existingPass,
    platform: existingPass?.platform ?? null,
  });
}

/**
 * POST /api/wallet/add
 * Create or retrieve the user's wallet pass for the specified platform.
 *
 * Request body: { platform: "apple" | "google" }
 * Response: { success: true, passUrl?: string, passData?: object }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { platform?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const platform = body.platform;
  if (platform !== "apple" && platform !== "google") {
    return NextResponse.json(
      { error: "Invalid platform. Must be 'apple' or 'google'." },
      { status: 400 }
    );
  }

  if (platform === "apple") {
    const pass = await getOrCreateWalletPass(userId);

    // Mark as active
    await db.walletPass.update({
      where: { id: pass.id },
      data: { isActive: true },
    });

    const passJson = await generateMasterPassJson(
      userId,
      pass.serialNumber,
      pass.authToken
    );

    // The download URL for the .pkpass file
    const passUrl = `https://receiptiles.com/api/wallet/apple/pass?serial=${pass.serialNumber}`;

    return NextResponse.json({
      success: true,
      passUrl,
      passData: passJson,
    });
  }

  // Google Wallet
  const pass = await getOrCreateGoogleWalletPass(userId);

  // Mark as active
  await db.walletPass.update({
    where: { id: pass.id },
    data: { isActive: true },
  });

  // Generate Google Wallet save link
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, createdAt: true },
  });

  const receiptCount = await db.receipt.count({ where: { userId } });
  const treesSaved = receiptCount / 8333;
  const co2Saved = receiptCount * 0.0057;

  const passUrl = generateGoogleWalletLink({
    userId,
    userName: user?.name ?? session.user.name ?? "Member",
    receiptCount,
    treesSaved,
    co2Saved,
    memberSince: user?.createdAt
      ? user.createdAt.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : new Date().getFullYear().toString(),
  });

  const passObject = await generateGooglePassObject(userId, pass.serialNumber);

  return NextResponse.json({
    success: true,
    passUrl,
    passData: passObject,
  });
}
