import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { addRewardRule } from "@/lib/actions/cards";
import { getMissedRewards } from "@/lib/card-optimizer";
import { CARD_DATABASE } from "@/lib/rewards/card-database";
import { AddCardForm } from "./add-card-form";
import { DeleteButton } from "./delete-button";

export const dynamic = 'force-dynamic';

const CARD_STYLES: Record<string, { bg: string; accent: string; logo: string }> = {
  visa: {
    bg: "from-[#1a1f71] via-[#1a1f71] to-[#0d47a1]",
    accent: "text-blue-200",
    logo: "VISA",
  },
  mastercard: {
    bg: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
    accent: "text-orange-300",
    logo: "mastercard",
  },
  amex: {
    bg: "from-[#006fcf] via-[#006fcf] to-[#0050a0]",
    accent: "text-blue-200",
    logo: "AMERICAN EXPRESS",
  },
  discover: {
    bg: "from-[#ff6000] via-[#ff6000] to-[#d45500]",
    accent: "text-orange-200",
    logo: "DISCOVER",
  },
  other: {
    bg: "from-zinc-800 via-zinc-700 to-zinc-900",
    accent: "text-zinc-300",
    logo: "",
  },
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cards & Rewards</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {cards.length} card{cards.length !== 1 ? "s" : ""} &middot; Optimize every purchase
          </p>
        </div>
      </div>

      {/* Stats */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5 border-l-4 border-l-emerald-500">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Cards</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{cards.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5 border-l-4 border-l-violet-500">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Reward Rules</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {cards.reduce((s, c) => s + c.rewardRules.length, 0)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5 border-l-4 border-l-red-500">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Missed Rewards</p>
            <p className="mt-1 text-2xl font-bold text-red-600">${totalMissed.toFixed(2)}</p>
          </div>
        </div>
      )}

      <AddCardForm />

      {/* Cards grid — credit card sized */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.length === 0 && (
          <div className="md:col-span-2 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 text-center">
            <p className="text-zinc-900 font-medium">No cards yet</p>
            <p className="text-zinc-400 text-sm mt-1">Add your credit cards to get reward optimization</p>
          </div>
        )}

        {cards.map((card) => {
          const style = CARD_STYLES[card.network] ?? CARD_STYLES.other;
          const dbCard = CARD_DATABASE.find(
            d => d.name.toLowerCase() === card.name.toLowerCase()
          );
          const topRate = card.rewardRules[0]?.rewardRate;

          return (
            <div key={card.id} className="space-y-4">
              {/* Realistic credit card — 3.375:2.125 aspect ratio */}
              <div className={`relative aspect-[3.375/2.125] rounded-2xl bg-gradient-to-br ${style.bg} p-6 overflow-hidden shadow-xl`}>
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] rounded-full bg-white/20" />
                  <div className="absolute bottom-[-30%] left-[-10%] w-[50%] h-[70%] rounded-full bg-white/10" />
                </div>

                {/* Delete button */}
                <div className="absolute top-4 right-4 z-10">
                  <DeleteButton id={card.id} type="card" />
                </div>

                {/* Card content */}
                <div className="relative h-full flex flex-col justify-between">
                  {/* Top: issuer + network */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/60 text-[10px] font-medium uppercase tracking-widest">
                        {dbCard?.issuer ?? card.network}
                      </p>
                      <p className="text-white text-sm font-bold mt-0.5">{card.name}</p>
                    </div>
                    {/* NFC symbol */}
                    <svg className="w-6 h-6 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Middle: chip + card number */}
                  <div>
                    {/* Chip */}
                    <div className="w-10 h-7 rounded-md bg-gradient-to-br from-amber-300/80 to-amber-500/80 mb-3 flex items-center justify-center">
                      <div className="w-6 h-4 rounded-sm border border-amber-600/30 grid grid-cols-3 grid-rows-2 gap-px">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="bg-amber-400/50 rounded-[1px]" />
                        ))}
                      </div>
                    </div>
                    <p className="text-white font-mono text-lg tracking-[0.2em]">
                      •••• •••• •••• {card.last4}
                    </p>
                  </div>

                  {/* Bottom: name + network logo */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-white/40 text-[9px] uppercase tracking-wider">Card Holder</p>
                      <p className="text-white/80 text-xs font-medium uppercase tracking-wider mt-0.5">
                        {session!.user!.name ?? "CARDHOLDER"}
                      </p>
                    </div>
                    <div className="text-right">
                      {card.network === "mastercard" ? (
                        <div className="flex items-center gap-[-4px]">
                          <div className="w-6 h-6 rounded-full bg-red-500 opacity-80" />
                          <div className="w-6 h-6 rounded-full bg-amber-400 opacity-80 -ml-2" />
                        </div>
                      ) : card.network === "amex" ? (
                        <p className="text-white font-bold text-[10px] tracking-wider">AMERICAN<br/>EXPRESS</p>
                      ) : (
                        <p className={`font-bold text-sm italic tracking-wider ${style.accent}`}>
                          {style.logo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reward rules below card */}
              <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">Rewards</h3>
                  {topRate && (
                    <span className="text-xs font-bold text-emerald-600">Up to {topRate}%</span>
                  )}
                </div>

                {card.rewardRules.length > 0 ? (
                  <div className="space-y-1.5 mb-3">
                    {card.rewardRules.map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-5 rounded bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                            {rule.rewardRate}%
                          </span>
                          <span className="text-xs text-zinc-700">
                            {rule.rewardType} {rule.merchantName ? `at ${rule.merchantName}` : rule.category ? `on ${rule.category}` : "on all"}
                          </span>
                        </div>
                        <DeleteButton id={rule.id} type="rule" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400 text-xs mb-3">No reward rules</p>
                )}

                {/* Perks from database */}
                {dbCard?.perks && dbCard.perks.length > 0 && (
                  <div className="mb-3 pt-2 border-t border-zinc-100">
                    <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Perks</p>
                    <div className="flex flex-wrap gap-1">
                      {dbCard.perks.slice(0, 4).map((perk, i) => (
                        <span key={i} className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium text-violet-700">
                          {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Annual fee */}
                {dbCard && (
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">Annual fee</span>
                    <span className="text-xs font-medium text-zinc-700">
                      {dbCard.annualFee === 0 ? "Free" : `$${dbCard.annualFee}`}
                    </span>
                  </div>
                )}

                {/* Add rule */}
                <form action={addRewardRule} className="mt-3 pt-3 border-t border-zinc-100 flex gap-2 flex-wrap items-end">
                  <input type="hidden" name="cardId" value={card.id} />
                  <input
                    name="category"
                    placeholder="Category"
                    className="flex-1 min-w-[80px] rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
                  />
                  <input
                    name="rewardRate"
                    type="number"
                    step="0.1"
                    placeholder="%"
                    required
                    className="w-14 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
                  />
                  <select name="rewardType" className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-900">
                    <option value="cashback">Cash</option>
                    <option value="points">Pts</option>
                    <option value="miles">Miles</option>
                  </select>
                  <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800">
                    +
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {/* Missed Rewards */}
      {missedRewards.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="font-semibold text-zinc-900">Missed Rewards</h2>
            <p className="text-xs text-zinc-400 mt-0.5">You could have earned more</p>
          </div>
          <div className="divide-y divide-zinc-50">
            {missedRewards.slice(0, 10).map((m) => (
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
