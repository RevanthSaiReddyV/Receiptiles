import { db } from "@receipts/db";
import type { CardRecommendation } from "@receipts/shared";

export async function getBestCardForReceipt(
  userId: string,
  category: string,
  merchantName: string
): Promise<CardRecommendation | null> {
  const cards = await db.userCard.findMany({
    where: { userId },
    include: { rewardRules: true },
  });

  if (cards.length === 0) return null;

  let bestCard: CardRecommendation | null = null;

  for (const card of cards) {
    for (const rule of card.rewardRules) {
      let matches = false;

      if (rule.merchantName && rule.merchantName.toLowerCase() === merchantName.toLowerCase()) {
        matches = true;
      } else if (rule.category && rule.category.toLowerCase() === category.toLowerCase()) {
        matches = true;
      } else if (!rule.category && !rule.merchantName) {
        matches = true;
      }

      if (matches) {
        const effectiveRate = rule.rewardRate * rule.multiplier;
        if (!bestCard || effectiveRate > bestCard.rewardRate) {
          bestCard = {
            cardId: card.id,
            cardName: card.name,
            rewardRate: effectiveRate,
            rewardType: rule.rewardType,
            estimatedReward: 0,
            reason: rule.merchantName
              ? `${effectiveRate}% ${rule.rewardType} at ${rule.merchantName}`
              : `${effectiveRate}% ${rule.rewardType} for ${rule.category || "all purchases"}`,
          };
        }
      }
    }
  }

  return bestCard;
}

export async function getMissedRewards(userId: string) {
  const receipts = await db.receipt.findMany({
    where: { userId, cardId: null },
    orderBy: { purchasedAt: "desc" },
    take: 50,
  });

  const missed: Array<{
    receiptId: string;
    merchant: string;
    total: number;
    recommendation: CardRecommendation;
  }> = [];

  for (const receipt of receipts) {
    const rec = await getBestCardForReceipt(
      userId,
      receipt.merchantCategory,
      receipt.merchantCanonicalName
    );
    if (rec && rec.rewardRate > 1) {
      rec.estimatedReward = (receipt.total * rec.rewardRate) / 100;
      missed.push({
        receiptId: receipt.id,
        merchant: receipt.merchantCanonicalName,
        total: receipt.total,
        recommendation: rec,
      });
    }
  }

  return missed;
}
