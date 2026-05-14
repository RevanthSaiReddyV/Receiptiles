import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";
import { getBestCardForReceipt, getMissedRewards } from "@/lib/card-optimizer";
import {
  CARD_DATABASE,
  calculateReward,
  findBestCard,
  getCardCategory,
} from "@/lib/rewards/card-database";

/**
 * GET /api/mobile/rewards
 * Comprehensive rewards data for the mobile app:
 * - Best card per category (wallet optimizer)
 * - Missed rewards this month
 * - Signup bonus progress
 * - Total rewards earned
 */
export async function GET(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get user's cards with reward rules
  const userCards = await db.userCard.findMany({
    where: { userId },
    include: { rewardRules: true },
  });

  // Get this month's receipts
  const receipts = await db.receipt.findMany({
    where: { userId, purchasedAt: { gte: monthStart } },
    select: {
      id: true,
      merchantCanonicalName: true,
      merchantCategory: true,
      total: true,
      cardId: true,
      cardLast4: true,
      purchasedAt: true,
    },
    orderBy: { purchasedAt: "desc" },
  });

  // Calculate total rewards earned this month
  let totalRewardsEarned = 0;
  const cardRewards: Record<string, { earned: number; count: number }> = {};

  for (const receipt of receipts) {
    if (receipt.cardId) {
      const card = userCards.find((c) => c.id === receipt.cardId);
      if (card) {
        // Find matching template
        const template = CARD_DATABASE.find(
          (t) =>
            t.name.toLowerCase().includes(card.name.toLowerCase()) ||
            card.name.toLowerCase().includes(t.name.toLowerCase())
        );
        if (template) {
          const result = calculateReward(
            template.id,
            receipt.total,
            receipt.merchantCanonicalName
          );
          const earned = result.cashValue || 0;
          totalRewardsEarned += earned;

          if (!cardRewards[card.id]) {
            cardRewards[card.id] = { earned: 0, count: 0 };
          }
          cardRewards[card.id].earned += earned;
          cardRewards[card.id].count += 1;
        }
      }
    }
  }

  // Best card per category (for the optimizer widget)
  const categories = [
    "Dining",
    "Groceries",
    "Gas",
    "Travel",
    "Shopping",
    "Streaming",
    "Entertainment",
    "Transit",
    "Drugstores",
  ];

  const cardTemplateIds = userCards
    .map((c) => {
      const match = CARD_DATABASE.find(
        (t) =>
          t.name.toLowerCase().includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(t.name.toLowerCase())
      );
      return match?.id;
    })
    .filter(Boolean) as string[];

  const bestCardPerCategory = categories.map((category) => {
    // Find best card for a $100 purchase in this category
    const sampleMerchant =
      category === "Dining"
        ? "Chipotle"
        : category === "Groceries"
        ? "Kroger"
        : category === "Gas"
        ? "Shell"
        : category === "Travel"
        ? "United Airlines"
        : category === "Shopping"
        ? "Amazon"
        : category === "Streaming"
        ? "Netflix"
        : category === "Entertainment"
        ? "AMC"
        : category === "Transit"
        ? "Uber"
        : "CVS";

    const best = findBestCard(cardTemplateIds, 100, sampleMerchant);
    const template = CARD_DATABASE.find((c) => c.id === best.cardId);
    const userCard = template
      ? userCards.find(
          (c) =>
            c.name.toLowerCase().includes(template.name.toLowerCase()) ||
            template.name.toLowerCase().includes(c.name.toLowerCase())
        )
      : null;

    return {
      category,
      bestCardId: userCard?.id ?? null,
      bestCardName: template?.name ?? null,
      rate: best.rate,
      rewardType: template?.rewards[0]?.type ?? "cashback",
    };
  });

  // Missed rewards (recent receipts without optimal card)
  const missedRewards = await getMissedRewards(userId);
  const totalMissed = missedRewards.reduce(
    (sum, m) => sum + m.recommendation.estimatedReward,
    0
  );

  // Signup bonus progress (if user has any tracked)
  const signupBonuses = await db.signupBonusGoal.findMany({
    where: { userId, isComplete: false },
    orderBy: { deadline: "asc" },
  });

  const enrichedBonuses = signupBonuses.map((bonus) => {
    const daysLeft = Math.ceil(
      (new Date(bonus.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyNeeded =
      daysLeft > 0 ? (bonus.targetSpend - bonus.currentSpend) / daysLeft : 0;

    return {
      ...bonus,
      progress: bonus.targetSpend > 0 ? bonus.currentSpend / bonus.targetSpend : 0,
      remaining: Math.max(bonus.targetSpend - bonus.currentSpend, 0),
      daysLeft: Math.max(daysLeft, 0),
      dailyNeeded: Math.round(dailyNeeded * 100) / 100,
    };
  });

  return NextResponse.json({
    summary: {
      totalRewardsEarned: Math.round(totalRewardsEarned * 100) / 100,
      totalMissedRewards: Math.round(totalMissed * 100) / 100,
      cardsCount: userCards.length,
      monthlyTransactions: receipts.length,
    },
    bestCardPerCategory,
    missedRewards: missedRewards.slice(0, 10),
    signupBonuses: enrichedBonuses,
    cardRewards: Object.entries(cardRewards).map(([cardId, data]) => ({
      cardId,
      cardName: userCards.find((c) => c.id === cardId)?.name ?? "",
      earned: Math.round(data.earned * 100) / 100,
      count: data.count,
    })),
  });
}
