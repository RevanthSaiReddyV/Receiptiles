import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: { offerId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { offerId } = body;

  if (!offerId) {
    return NextResponse.json(
      { error: "offerId is required" },
      { status: 400 }
    );
  }

  // Verify the offer exists and is active
  const offer = await db.cardLinkedOffer.findFirst({
    where: {
      id: offerId,
      active: true,
      expiresAt: { gt: new Date() },
    },
  });

  if (!offer) {
    return NextResponse.json(
      { error: "Offer not found or expired" },
      { status: 404 }
    );
  }

  // Check if already activated
  const existing = await db.userOfferActivation.findUnique({
    where: {
      userId_offerId: { userId, offerId },
    },
  });

  if (existing) {
    return NextResponse.json({
      activated: true,
      offerId,
      message: "Offer was already activated",
      activatedAt: existing.activatedAt,
    });
  }

  // Activate the offer
  await db.userOfferActivation.create({
    data: {
      userId,
      offerId,
    },
  });

  // Increment activation count
  await db.cardLinkedOffer.update({
    where: { id: offerId },
    data: { activationCount: { increment: 1 } },
  });

  return NextResponse.json({
    activated: true,
    offerId,
    message: "Offer activated successfully",
  });
}
