import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";
import crypto from "crypto";

export async function GET() {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, referralCode: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const referralCode = user.referralCode ?? user.id.slice(0, 8).toUpperCase();

  const referrals = await db.user.findMany({
    where: { referredBy: userId },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    referralCode,
    referralLink: `https://receipts.app/join/${referralCode}`,
    totalReferred: referrals.length,
    referrals: referrals.map((r) => ({
      id: r.id,
      name: r.name ?? "User",
      joinedAt: r.createdAt.toISOString(),
    })),
    rewards: {
      perReferral: "$5",
      earned: referrals.length * 5,
    },
  });
}

export async function POST(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channel } = await request.json();

  return NextResponse.json({
    shared: true,
    channel: channel ?? "generic",
  });
}
