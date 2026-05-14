import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get user's top spending categories from recent receipts
  const topCategories = await db.receipt.groupBy({
    by: ["merchantCategory"],
    where: {
      userId,
      purchasedAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // last 90 days
      },
    },
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: "desc" } },
    take: 5,
  });

  const userCategories = topCategories.map((c) => c.merchantCategory);

  // Find active offers matching user's categories
  const now = new Date();
  const offers = await db.cardLinkedOffer.findMany({
    where: {
      active: true,
      expiresAt: { gt: now },
      startsAt: { lte: now },
      OR: [
        { category: { in: userCategories.length > 0 ? userCategories : ["Dining", "Groceries", "Shopping"] } },
        { targetCategories: { hasSome: userCategories.length > 0 ? userCategories : ["Dining", "Groceries", "Shopping"] } },
        { targetAudience: "all" },
      ],
    },
    orderBy: [{ priority: "desc" }, { cashbackPercent: "desc" }],
    take: 20,
    include: {
      activations: {
        where: { userId },
        select: { id: true, activatedAt: true, redeemedAt: true },
      },
    },
  });

  const personalizedOffers = offers.map((offer) => ({
    id: offer.id,
    merchantName: offer.merchantName,
    merchantLogo: offer.merchantLogo,
    title: offer.title,
    description: offer.description,
    type: offer.type,
    cashbackPercent: offer.cashbackPercent,
    cashbackMax: offer.cashbackMax,
    minSpend: offer.minSpend,
    category: offer.category,
    expiresAt: offer.expiresAt,
    isActivated: offer.activations.length > 0,
    activatedAt: offer.activations[0]?.activatedAt ?? null,
    isRedeemed: offer.activations[0]?.redeemedAt != null,
  }));

  return NextResponse.json({
    offers: personalizedOffers,
    userCategories,
    total: personalizedOffers.length,
  });
}
