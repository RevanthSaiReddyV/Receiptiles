import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { generateGoogleWalletLink } from "@/lib/wallet/google-wallet";

/**
 * GET /api/wallet/google
 * Redirects to the Google Wallet "Save to Wallet" link for the user's
 * master Receiptiles pass.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", "https://receiptiles.com"));
  }

  const userId = session.user.id;

  const receiptCount = await db.receipt.count({ where: { userId } });
  const treesSaved = receiptCount / 8333;
  const co2Saved = receiptCount * 0.0057;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, createdAt: true },
  });

  const link = generateGoogleWalletLink({
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

  return NextResponse.redirect(link);
}
