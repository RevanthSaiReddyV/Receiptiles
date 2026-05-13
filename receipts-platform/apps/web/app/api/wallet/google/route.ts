import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { generateGoogleWalletLink } from "@/lib/wallet/google-wallet";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL!));
  }

  const userId = session.user.id;

  const receiptCount = await db.receipt.count({ where: { userId } });
  const treesSaved = receiptCount / 8333;
  const co2Saved = receiptCount * 0.0057;

  const link = generateGoogleWalletLink({
    userId,
    userName: session.user.name ?? "Member",
    receiptCount,
    treesSaved,
    co2Saved,
    memberSince: new Date().getFullYear().toString(),
  });

  return NextResponse.redirect(link);
}
