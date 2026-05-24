import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { getMissedRewards } from "@/lib/card-optimizer";
import { CARD_DATABASE } from "@/lib/rewards/card-database";
import { getCardImageByName } from "@/lib/rewards/card-images";
import { parseCardBenefits } from "./parse-benefits";
import { CardsTabs } from "./cards-tabs";

export const dynamic = 'force-dynamic';

const GRADIENT_BG: Record<string, string> = {
  visa: "from-[#1a1f71] to-[#0d47a1]",
  mastercard: "from-[#1a1a2e] to-[#0f3460]",
  amex: "from-[#006fcf] to-[#0050a0]",
  discover: "from-[#ff6000] to-[#d45500]",
  other: "from-zinc-800 to-zinc-900",
};

export default async function CardsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const cards = await db.userCard.findMany({
    where: { userId },
    include: { rewardRules: { orderBy: { rewardRate: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  const missedRewards = await getMissedRewards(userId);
  const totalMissed = missedRewards.reduce(
    (s, m) => s + m.recommendation.estimatedReward,
    0
  );

  // Serialize cards as plain objects (no Date instances)
  const serializedCards = cards.map((card: typeof cards[number]) => ({
    id: card.id,
    name: card.name,
    last4: card.last4,
    network: card.network,
    createdAt: card.createdAt.toISOString(),
    rewardRules: card.rewardRules.map((r: typeof card.rewardRules[number]) => ({
      id: r.id,
      category: r.category,
      merchantName: r.merchantName,
      rewardRate: r.rewardRate,
      rewardType: r.rewardType,
    })),
  }));

  // Serialize missed rewards
  const serializedMissedRewards = missedRewards.map((m) => ({
    receiptId: m.receiptId,
    merchant: m.merchant,
    total: m.total,
    recommendation: {
      cardName: m.recommendation.cardName,
      estimatedReward: m.recommendation.estimatedReward,
    },
  }));

  // Build a lookup of card DB data per card ID
  const cardDbLookup: Record<
    string,
    {
      dbId: string | null;
      issuer: string;
      imageUrl: string | null;
      perks: string[];
      annualFee: number | null;
      rewards: Array<{
        category: string | null;
        merchantName?: string;
        rate: number;
        type: "cashback" | "points" | "miles";
        pointValue?: number;
        cap?: number;
        rotating?: boolean;
        note?: string;
      }>;
    }
  > = {};

  for (const card of cards) {
    const dbCard = CARD_DATABASE.find(
      (d) => d.name.toLowerCase() === card.name.toLowerCase()
    );
    cardDbLookup[card.id] = {
      dbId: dbCard?.id ?? null,
      issuer: dbCard?.issuer ?? card.network.toUpperCase(),
      imageUrl: getCardImageByName(card.name),
      perks: dbCard?.perks ?? [],
      annualFee: dbCard?.annualFee ?? null,
      rewards: dbCard?.rewards ?? [],
    };
  }

  // Parse card benefits for the Benefits tab
  const cardBenefits = parseCardBenefits(
    cards
      .map((card: typeof cards[number]) => {
        const dbCard = CARD_DATABASE.find(
          (d) => d.name.toLowerCase() === card.name.toLowerCase()
        );
        return {
          id: card.id,
          name: card.name,
          dbPerks: dbCard?.perks ?? [],
        };
      })
      .filter((c: { id: string; name: string; dbPerks: string[] }) => c.dbPerks.length > 0)
  );

  return (
    <CardsTabs
      cards={serializedCards}
      missedRewards={serializedMissedRewards}
      totalMissed={totalMissed}
      cardBenefits={cardBenefits}
      gradientMap={GRADIENT_BG}
      cardDbLookup={cardDbLookup}
    />
  );
}
