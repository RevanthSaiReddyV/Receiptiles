import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { addRewardRule } from "@/lib/actions/cards";
import { getMissedRewards } from "@/lib/card-optimizer";
import { AddCardForm } from "./add-card-form";
import { DeleteButton } from "./delete-button";

export const dynamic = 'force-dynamic';

const NETWORK_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  visa: { bg: "from-blue-600 to-blue-800", text: "text-blue-100", gradient: "bg-gradient-to-br" },
  mastercard: { bg: "from-orange-500 to-red-600", text: "text-orange-100", gradient: "bg-gradient-to-br" },
  amex: { bg: "from-zinc-700 to-zinc-900", text: "text-zinc-200", gradient: "bg-gradient-to-br" },
  discover: { bg: "from-amber-500 to-orange-600", text: "text-amber-100", gradient: "bg-gradient-to-br" },
  other: { bg: "from-zinc-600 to-zinc-800", text: "text-zinc-200", gradient: "bg-gradient-to-br" },
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cards & Rewards</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {cards.length} card{cards.length !== 1 ? "s" : ""} &middot; Optimize your rewards
          </p>
        </div>
      </div>

      {/* Reward Summary */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5 border-l-4 border-l-emerald-500">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Cards Added</p>
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
            <p className="text-[11px] text-zinc-400 mt-0.5">Could have earned with optimal card use</p>
          </div>
        </div>
      )}

      {/* Add Card */}
      <AddCardForm />

      {/* Card List */}
      <div className="mt-8 space-y-6">
        {cards.length === 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <p className="text-zinc-900 font-medium">No cards yet</p>
            <p className="text-zinc-400 text-sm mt-1">Add your credit cards to get reward optimization</p>
          </div>
        )}

        {cards.map((card) => {
          const colors = NETWORK_COLORS[card.network] ?? NETWORK_COLORS.other;
          return (
            <div key={card.id} className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
              {/* Visual card */}
              <div className={`${colors.gradient} ${colors.bg} p-6 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-10 translate-x-10" />
                <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-8 -translate-x-8" />

                <div className="relative flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium ${colors.text} opacity-80`}>{card.network.toUpperCase()}</p>
                    <p className="text-white text-lg font-bold mt-1">{card.name}</p>
                    <p className="text-white/60 text-sm font-mono mt-3 tracking-[0.2em]">
                      **** **** **** {card.last4}
                    </p>
                  </div>
                  <DeleteButton id={card.id} type="card" />
                </div>

                {/* Best rate badge */}
                {card.rewardRules.length > 0 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {card.rewardRules.slice(0, 3).map((rule) => (
                      <span key={rule.id} className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                        {rule.rewardRate}% {rule.rewardType} {rule.category ? `on ${rule.category}` : rule.merchantName ? `at ${rule.merchantName}` : "base"}
                      </span>
                    ))}
                    {card.rewardRules.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/60">
                        +{card.rewardRules.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Reward rules */}
              <div className="p-5">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">Reward Rules</h3>

                {card.rewardRules.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {card.rewardRules.map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-emerald-700">{rule.rewardRate}%</span>
                          </div>
                          <span className="text-sm text-zinc-700">
                            {rule.rewardType}{" "}
                            {rule.merchantName ? `at ${rule.merchantName}` : rule.category ? `on ${rule.category}` : "on all purchases"}
                          </span>
                        </div>
                        <DeleteButton id={rule.id} type="rule" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-400 text-sm mb-4">No reward rules yet</p>
                )}

                {/* Add rule form */}
                <form action={addRewardRule} className="flex gap-2 flex-wrap items-end">
                  <input type="hidden" name="cardId" value={card.id} />
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase">Category</label>
                    <input
                      name="category"
                      placeholder="e.g., Dining"
                      className="mt-0.5 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase">Rate %</label>
                    <input
                      name="rewardRate"
                      type="number"
                      step="0.1"
                      placeholder="3"
                      required
                      className="mt-0.5 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase">Type</label>
                    <select name="rewardType" className="mt-0.5 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100">
                      <option value="cashback">Cashback</option>
                      <option value="points">Points</option>
                      <option value="miles">Miles</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
                  >
                    + Add
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
            <p className="text-xs text-zinc-400 mt-0.5">You could have earned more with the right card</p>
          </div>
          <div className="divide-y divide-zinc-50">
            {missedRewards.slice(0, 10).map((m) => (
              <div key={m.receiptId} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{m.merchant}</p>
                  <p className="text-xs text-zinc-400">
                    ${m.total.toFixed(2)} &middot; Use {m.recommendation.cardName}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  +${m.recommendation.estimatedReward.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
