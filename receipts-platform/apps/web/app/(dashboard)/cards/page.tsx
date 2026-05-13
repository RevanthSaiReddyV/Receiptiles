import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { addRewardRule } from "@/lib/actions/cards";
import { getMissedRewards } from "@/lib/card-optimizer";
import { CARD_DATABASE } from "@/lib/rewards/card-database";
import { getCardImageByName } from "@/lib/rewards/card-images";
import { AddCardForm } from "./add-card-form";
import { BenefitTracker, parseCardBenefits } from "./benefit-tracker";
import { DeleteButton } from "./delete-button";
import { FlipCard } from "./flip-card";

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
  const totalMissed = missedRewards.reduce((s, m) => s + m.recommendation.estimatedReward, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cards & Rewards</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tap a card to see rewards. {cards.length} card{cards.length !== 1 ? "s" : ""} added.
          </p>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4 border-l-4 border-l-emerald-500">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Cards</p>
            <p className="text-xl font-bold text-zinc-900">{cards.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4 border-l-4 border-l-violet-500">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Rules</p>
            <p className="text-xl font-bold text-zinc-900">{cards.reduce((s, c) => s + c.rewardRules.length, 0)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4 border-l-4 border-l-red-500">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Missed</p>
            <p className="text-xl font-bold text-red-600">${totalMissed.toFixed(2)}</p>
          </div>
        </div>
      )}

      <AddCardForm />

      {/* Cards grid — smaller, 3 columns, flippable */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 text-center">
            <p className="text-zinc-900 font-medium">No cards yet</p>
            <p className="text-zinc-400 text-sm mt-1">Add your credit cards above</p>
          </div>
        )}

        {cards.map((card) => {
          const dbCard = CARD_DATABASE.find(d => d.name.toLowerCase() === card.name.toLowerCase());
          const imageUrl = getCardImageByName(card.name);
          const topRate = card.rewardRules[0]?.rewardRate ?? null;

          return (
            <div key={card.id} className="space-y-2">
              <FlipCard
                cardName={card.name}
                last4={card.last4}
                network={card.network}
                issuer={dbCard?.issuer ?? card.network.toUpperCase()}
                imageUrl={imageUrl}
                rewards={card.rewardRules.map(r => ({
                  id: r.id,
                  category: r.category,
                  merchantName: r.merchantName,
                  rewardRate: r.rewardRate,
                  rewardType: r.rewardType,
                }))}
                perks={dbCard?.perks ?? []}
                annualFee={dbCard?.annualFee ?? null}
                topRate={topRate}
                gradientBg={GRADIENT_BG[card.network] ?? GRADIENT_BG.other}
              />

              {/* Quick actions below card */}
              <div className="flex items-center justify-between px-1">
                <form action={addRewardRule} className="flex gap-1 items-center">
                  <input type="hidden" name="cardId" value={card.id} />
                  <input name="category" placeholder="Category" className="w-16 rounded border border-zinc-200 px-1.5 py-1 text-[10px] text-zinc-900 placeholder:text-zinc-400" />
                  <input name="rewardRate" type="number" step="0.1" placeholder="%" required className="w-10 rounded border border-zinc-200 px-1.5 py-1 text-[10px] text-zinc-900" />
                  <input type="hidden" name="rewardType" value="cashback" />
                  <button type="submit" className="rounded bg-zinc-900 px-2 py-1 text-[10px] font-medium text-white hover:bg-zinc-800">+</button>
                </form>
                <DeleteButton id={card.id} type="card" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Benefit Tracker */}
      {(() => {
        const cardBenefits = parseCardBenefits(
          cards
            .map(card => {
              const dbCard = CARD_DATABASE.find(d => d.name.toLowerCase() === card.name.toLowerCase());
              return {
                id: card.id,
                name: card.name,
                dbPerks: dbCard?.perks ?? [],
              };
            })
            .filter(c => c.dbPerks.length > 0)
        );
        return cardBenefits.length > 0 ? <BenefitTracker cardBenefits={cardBenefits} /> : null;
      })()}

      {/* Missed Rewards */}
      {missedRewards.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="font-semibold text-zinc-900">Missed Rewards</h2>
          </div>
          <div className="divide-y divide-zinc-50">
            {missedRewards.slice(0, 8).map((m) => (
              <div key={m.receiptId} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{m.merchant}</p>
                  <p className="text-xs text-zinc-400">${m.total.toFixed(2)} &middot; Use {m.recommendation.cardName}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">+${m.recommendation.estimatedReward.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
