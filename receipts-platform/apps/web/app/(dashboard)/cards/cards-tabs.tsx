"use client";

import { useState, useMemo } from "react";
import { FlipCard } from "./flip-card";
import { BenefitTracker } from "./benefit-tracker";
import { NearbyRecommendations } from "./nearby-recs";
import { AddCardForm } from "./add-card-form";
import { CardScanner } from "./card-scanner";
import { DeleteButton } from "./delete-button";
import { addRewardRule } from "@/lib/actions/cards";
import {
  CARD_DATABASE,
  findBestCard,
  calculateReward,
  type CardReward,
} from "@/lib/rewards/card-database";

// ---------------------------------------------------------------------------
// Types for serialized data passed from the server component
// ---------------------------------------------------------------------------

interface SerializedRewardRule {
  id: string;
  category: string | null;
  merchantName: string | null;
  rewardRate: number;
  rewardType: string;
}

interface SerializedCard {
  id: string;
  name: string;
  last4: string;
  network: string;
  createdAt: string;
  rewardRules: SerializedRewardRule[];
}

interface SerializedMissedReward {
  receiptId: string;
  merchant: string;
  total: number;
  recommendation: {
    cardName: string;
    estimatedReward: number;
  };
}

interface CardBenefit {
  cardName: string;
  cardId: string;
  perks: Array<{
    name: string;
    annualValue: number | null;
    resetDate: string;
  }>;
}

interface CardsTabsProps {
  cards: SerializedCard[];
  missedRewards: SerializedMissedReward[];
  totalMissed: number;
  cardBenefits: CardBenefit[];
  gradientMap: Record<string, string>;
  cardDbLookup: Record<
    string,
    {
      dbId: string | null;
      issuer: string;
      imageUrl: string | null;
      perks: string[];
      annualFee: number | null;
      rewards: CardReward[];
    }
  >;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = ["Wallet", "Rewards", "Benefits", "Nearby"] as const;
type Tab = (typeof TABS)[number];

const CATEGORY_ICONS: Record<string, string> = {
  Dining: "🍽️",
  Groceries: "🛒",
  Gas: "⛽",
  Shopping: "🛍️",
  Drugstores: "💊",
  Entertainment: "🎬",
  Travel: "✈️",
  Hotels: "🏨",
  Streaming: "📺",
  Transit: "🚌",
  Electronics: "💻",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string; ring: string }> = {
  Dining:        { bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-500",   ring: "ring-amber-200" },
  Groceries:     { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", ring: "ring-emerald-200" },
  Gas:           { bg: "bg-blue-50",    text: "text-blue-700",    bar: "bg-blue-500",    ring: "ring-blue-200" },
  Shopping:      { bg: "bg-violet-50",  text: "text-violet-700",  bar: "bg-violet-500",  ring: "ring-violet-200" },
  Travel:        { bg: "bg-sky-50",     text: "text-sky-700",     bar: "bg-sky-500",     ring: "ring-sky-200" },
  Electronics:   { bg: "bg-cyan-50",    text: "text-cyan-700",    bar: "bg-cyan-500",    ring: "ring-cyan-200" },
  Drugstores:    { bg: "bg-pink-50",    text: "text-pink-700",    bar: "bg-pink-500",    ring: "ring-pink-200" },
  Entertainment: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", bar: "bg-fuchsia-500", ring: "ring-fuchsia-200" },
  Hotels:        { bg: "bg-indigo-50",  text: "text-indigo-700",  bar: "bg-indigo-500",  ring: "ring-indigo-200" },
  Streaming:     { bg: "bg-purple-50",  text: "text-purple-700",  bar: "bg-purple-500",  ring: "ring-purple-200" },
  Transit:       { bg: "bg-teal-50",    text: "text-teal-700",    bar: "bg-teal-500",    ring: "ring-teal-200" },
};

const BEST_CARD_CATEGORIES = [
  "Dining",
  "Groceries",
  "Gas",
  "Travel",
  "Shopping",
  "Drugstores",
  "Entertainment",
  "Hotels",
  "Streaming",
  "Transit",
  "Electronics",
];

type SortMode = "recent" | "network" | "rewards";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CardsTabs({
  cards,
  missedRewards,
  totalMissed,
  cardBenefits,
  gradientMap,
  cardDbLookup,
}: CardsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Wallet");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const totalRules = cards.reduce((s, c) => s + c.rewardRules.length, 0);

  const sortedCards = useMemo(() => {
    const copy = [...cards];
    switch (sortMode) {
      case "recent":
        return copy.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "network":
        return copy.sort((a, b) => a.network.localeCompare(b.network));
      case "rewards":
        return copy.sort((a, b) => {
          const aTop = a.rewardRules[0]?.rewardRate ?? 0;
          const bTop = b.rewardRules[0]?.rewardRate ?? 0;
          return bTop - aTop;
        });
      default:
        return copy;
    }
  }, [cards, sortMode]);

  // Build dbCardIds for NearbyRecommendations
  const userCardsForNearby = useMemo(
    () =>
      cards.map((c) => ({
        id: c.id,
        name: c.name,
        dbId: cardDbLookup[c.id]?.dbId ?? null,
      })),
    [cards, cardDbLookup]
  );

  // Aggregate rewards by type
  const rewardsByType = useMemo(() => {
    const groups: Record<string, Array<{ cardName: string; cardId: string; rules: SerializedRewardRule[] }>> = {
      cashback: [],
      points: [],
      miles: [],
    };
    for (const card of cards) {
      for (const type of ["cashback", "points", "miles"] as const) {
        const matching = card.rewardRules.filter((r) => r.rewardType === type);
        if (matching.length > 0) {
          groups[type].push({ cardName: card.name, cardId: card.id, rules: matching });
        }
      }
    }
    return groups;
  }, [cards]);

  // Best card for each spending category
  const bestCardPerCategory = useMemo(() => {
    const dbCardIds = cards
      .map((c) => cardDbLookup[c.id]?.dbId)
      .filter(Boolean) as string[];

    if (dbCardIds.length === 0) return [];

    return BEST_CARD_CATEGORIES.map((cat) => {
      // Use $100 hypothetical spend to rank
      const best = findBestCard(dbCardIds, 100, cat);
      const dbCard = best.cardId
        ? CARD_DATABASE.find((c) => c.id === best.cardId)
        : null;
      return {
        category: cat,
        cardName: dbCard?.name ?? null,
        rate: best.rate,
        reward: best.reward,
      };
    }).filter((r) => r.cardName && r.rate > 0);
  }, [cards, cardDbLookup]);

  // Total potential rewards across all cards (on $100 hypothetical per category)
  const totalPotential = useMemo(() => {
    return bestCardPerCategory.reduce((sum, b) => sum + b.reward, 0);
  }, [bestCardPerCategory]);

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderWalletTab() {
    return (
      <div>
        {/* Summary row */}
        {cards.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4 border-l-4 border-l-emerald-500">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Cards
              </p>
              <p className="text-xl font-bold text-zinc-900">{cards.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4 border-l-4 border-l-violet-500">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Reward Rules
              </p>
              <p className="text-xl font-bold text-zinc-900">{totalRules}</p>
            </div>
            <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4 border-l-4 border-l-red-500">
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Missed
              </p>
              <p className="text-xl font-bold text-red-600">${totalMissed.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Sort buttons */}
        {cards.length > 1 && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mr-1">
              Sort:
            </span>
            {(["recent", "network", "rewards"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sortMode === mode
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {cards.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 text-center">
              <p className="text-zinc-900 font-medium">No cards yet</p>
              <p className="text-zinc-400 text-sm mt-1">
                Add your credit cards below
              </p>
            </div>
          )}

          {sortedCards.map((card) => {
            const lookup = cardDbLookup[card.id];
            const topRate = card.rewardRules[0]?.rewardRate ?? null;

            return (
              <div key={card.id} className="space-y-2">
                <FlipCard
                  cardName={card.name}
                  last4={card.last4}
                  network={card.network}
                  issuer={lookup?.issuer ?? card.network.toUpperCase()}
                  imageUrl={lookup?.imageUrl ?? null}
                  rewards={card.rewardRules.map((r) => ({
                    id: r.id,
                    category: r.category,
                    merchantName: r.merchantName,
                    rewardRate: r.rewardRate,
                    rewardType: r.rewardType,
                  }))}
                  perks={lookup?.perks ?? []}
                  annualFee={lookup?.annualFee ?? null}
                  topRate={topRate}
                  gradientBg={gradientMap[card.network] ?? gradientMap["other"] ?? "from-zinc-800 to-zinc-900"}
                />

                {/* Quick actions below card */}
                <div className="flex items-center justify-between px-1">
                  <form action={addRewardRule} className="flex gap-1 items-center">
                    <input type="hidden" name="cardId" value={card.id} />
                    <input
                      name="category"
                      placeholder="Category"
                      className="w-16 rounded border border-zinc-200 px-1.5 py-1 text-[10px] text-zinc-900 placeholder:text-zinc-400"
                    />
                    <input
                      name="rewardRate"
                      type="number"
                      step="0.1"
                      placeholder="%"
                      required
                      className="w-10 rounded border border-zinc-200 px-1.5 py-1 text-[10px] text-zinc-900"
                    />
                    <input type="hidden" name="rewardType" value="cashback" />
                    <button
                      type="submit"
                      className="rounded bg-zinc-900 px-2 py-1 text-[10px] font-medium text-white hover:bg-zinc-800"
                    >
                      +
                    </button>
                  </form>
                  <DeleteButton id={card.id} type="card" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Add card section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Scan Card
            </p>
            <CardScanner />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
              Or Add Manually
            </p>
            <AddCardForm />
          </div>
        </div>

        {/* Missed Rewards */}
        {missedRewards.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="font-semibold text-zinc-900">Missed Rewards</h2>
            </div>
            <div className="divide-y divide-zinc-50">
              {missedRewards.slice(0, 8).map((m) => (
                <div
                  key={m.receiptId}
                  className="px-6 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {m.merchant}
                    </p>
                    <p className="text-xs text-zinc-400">
                      ${m.total.toFixed(2)} &middot; Use{" "}
                      {m.recommendation.cardName}
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

  function renderRewardsTab() {
    if (cards.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 text-center">
          <p className="text-zinc-900 font-medium">No cards added</p>
          <p className="text-zinc-400 text-sm mt-1">
            Switch to the Wallet tab to add your credit cards.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Total potential */}
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5">
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            Potential rewards on $100 per category
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            ${totalPotential.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Across {bestCardPerCategory.length} spending categories with{" "}
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Rewards by type */}
        {(["cashback", "points", "miles"] as const).map((type) => {
          const group = rewardsByType[type];
          if (group.length === 0) return null;

          const typeLabel =
            type === "cashback"
              ? "Cash Back"
              : type === "points"
              ? "Points"
              : "Miles";
          const typeColor =
            type === "cashback"
              ? "emerald"
              : type === "points"
              ? "violet"
              : "sky";

          return (
            <div
              key={type}
              className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full bg-${typeColor}-500`}
                  />
                  <h3 className="font-semibold text-zinc-900 text-sm">
                    {typeLabel}
                  </h3>
                  <span className="text-xs text-zinc-400 ml-auto">
                    {group.length} card{group.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-zinc-50">
                {group.map(({ cardName, cardId, rules }) => (
                  <div key={cardId} className="px-6 py-4">
                    <p className="text-sm font-medium text-zinc-900 mb-3">
                      {cardName}
                    </p>
                    <div className="space-y-2">
                      {rules.slice(0, 6).map((rule) => {
                        const maxRate = Math.max(
                          ...rules.map((r) => r.rewardRate)
                        );
                        const barWidth =
                          maxRate > 0
                            ? Math.max(
                                12,
                                (rule.rewardRate / maxRate) * 100
                              )
                            : 12;

                        return (
                          <div
                            key={rule.id}
                            className="flex items-center gap-3"
                          >
                            <span className="text-[10px] text-zinc-500 w-20 truncate flex-shrink-0">
                              {rule.merchantName
                                ? rule.merchantName
                                : rule.category
                                ? rule.category
                                : "All purchases"}
                            </span>
                            <div className="flex-1 h-5 bg-zinc-50 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-${typeColor}-500 flex items-center justify-end pr-2 transition-all`}
                                style={{ width: `${barWidth}%` }}
                              >
                                <span className="text-[9px] font-bold text-white whitespace-nowrap">
                                  {rule.rewardRate}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Best card for... section */}
        {bestCardPerCategory.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900 text-sm">
                Best card for...
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Optimal card from your wallet per spending category
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 divide-zinc-50">
              {bestCardPerCategory.map((item) => {
                const colors =
                  CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS["Shopping"];
                const icon = CATEGORY_ICONS[item.category] ?? "💳";

                return (
                  <div
                    key={item.category}
                    className="px-6 py-3.5 flex items-center gap-3 sm:border-b sm:border-zinc-50"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}
                    >
                      <span className="text-sm">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${colors.text}`}>
                        {item.category}
                      </p>
                      <p className="text-[11px] text-zinc-600 truncate">
                        {item.cardName}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-600">
                        {item.rate}%
                      </p>
                      <p className="text-[9px] text-zinc-400">back</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderBenefitsTab() {
    if (cardBenefits.length === 0) {
      return (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 text-center">
          <p className="text-zinc-900 font-medium">No trackable benefits</p>
          <p className="text-zinc-400 text-sm mt-1">
            Benefits appear here when your cards have dollar-value perks like
            annual credits.
          </p>
        </div>
      );
    }

    // Separate monetary perks (have dollar value) and non-monetary perks
    const monetaryBenefits: CardBenefit[] = [];
    const nonMonetaryPerks: Array<{ cardName: string; perks: string[] }> = [];

    for (const cb of cardBenefits) {
      const monetary = cb.perks.filter((p) => p.annualValue !== null);
      const nonMonetary = cb.perks.filter((p) => p.annualValue === null);

      if (monetary.length > 0) {
        monetaryBenefits.push({
          ...cb,
          perks: monetary,
        });
      }
      if (nonMonetary.length > 0) {
        nonMonetaryPerks.push({
          cardName: cb.cardName,
          perks: nonMonetary.map((p) => p.name),
        });
      }
    }

    return (
      <div className="space-y-6">
        {/* BenefitTracker handles monetary perks with progress bars */}
        {monetaryBenefits.length > 0 && (
          <BenefitTracker cardBenefits={monetaryBenefits} />
        )}

        {/* Non-monetary perks listed by card */}
        {nonMonetaryPerks.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900 text-sm">
                Additional Perks
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Non-monetary benefits from your cards
              </p>
            </div>
            <div className="divide-y divide-zinc-50">
              {nonMonetaryPerks.map((card) => (
                <div key={card.cardName} className="px-6 py-4">
                  <p className="text-sm font-medium text-zinc-900 mb-2">
                    {card.cardName}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {card.perks.map((perk, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-lg bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700"
                      >
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderNearbyTab() {
    // Group merchants by category with category icons
    return (
      <NearbyRecommendations userCards={userCardsForNearby} />
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Cards & Rewards</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {cards.length} card{cards.length !== 1 ? "s" : ""} added
            {totalRules > 0 && <> &middot; {totalRules} reward rule{totalRules !== 1 ? "s" : ""}</>}
          </p>
        </div>
      </div>

      {/* Sticky tab pills */}
      <div className="sticky top-0 z-20 bg-zinc-50/80 backdrop-blur-sm -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "Wallet" && renderWalletTab()}
      {activeTab === "Rewards" && renderRewardsTab()}
      {activeTab === "Benefits" && renderBenefitsTab()}
      {activeTab === "Nearby" && renderNearbyTab()}
    </div>
  );
}
