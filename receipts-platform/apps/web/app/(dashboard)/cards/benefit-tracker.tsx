"use client";

import { useState } from "react";

interface CardBenefit {
  cardName: string;
  cardId: string;
  perks: Array<{
    name: string;
    annualValue: number | null;
    resetDate: string; // ISO string for card anniversary / year end
  }>;
}

interface BenefitTrackerProps {
  cardBenefits: CardBenefit[];
}

/** Extract a dollar amount from a perk string, e.g. "$300 annual travel credit" -> 300 */
function extractDollarAmount(perk: string): number | null {
  const match = perk.match(/\$(\d[\d,]*)/);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ""));
}

type BenefitStatus = "available" | "partial" | "used";

function getStatus(used: number, total: number): BenefitStatus {
  if (used === 0) return "available";
  if (used >= total) return "used";
  return "partial";
}

const STATUS_CONFIG: Record<BenefitStatus, { label: string; bg: string; text: string; bar: string }> = {
  available: { label: "Available", bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" },
  partial: { label: "Partially Used", bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" },
  used: { label: "Fully Used", bg: "bg-zinc-100", text: "text-zinc-500", bar: "bg-zinc-400" },
};

export function BenefitTracker({ cardBenefits }: BenefitTrackerProps) {
  // Track used amounts per card+perk as local state (keyed by "cardId:perkIndex")
  const [usedAmounts, setUsedAmounts] = useState<Record<string, number>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (cardBenefits.length === 0) return null;

  const handleStartEdit = (key: string, currentUsed: number) => {
    setEditingKey(key);
    setEditValue(currentUsed > 0 ? currentUsed.toString() : "");
  };

  const handleSaveEdit = (key: string, maxValue: number) => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed >= 0) {
      setUsedAmounts(prev => ({
        ...prev,
        [key]: Math.min(parsed, maxValue),
      }));
    }
    setEditingKey(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  return (
    <div className="mt-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Benefit Tracker</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Track your card perks and credits throughout the year.</p>
      </div>

      <div className="space-y-4">
        {cardBenefits.map((card) => (
          <div
            key={card.cardId}
            className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900 text-sm">{card.cardName}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {card.perks.length} trackable benefit{card.perks.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="divide-y divide-zinc-50">
              {card.perks.map((perk, perkIdx) => {
                const key = `${card.cardId}:${perkIdx}`;
                const totalValue = perk.annualValue ?? 0;
                const used = usedAmounts[key] ?? 0;
                const remaining = Math.max(0, totalValue - used);
                const percentage = totalValue > 0 ? Math.min(100, (used / totalValue) * 100) : 0;
                const status = getStatus(used, totalValue);
                const config = STATUS_CONFIG[status];
                const isEditing = editingKey === key;

                return (
                  <div key={key} className="px-6 py-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{perk.name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Resets: {new Date(perk.resetDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`ml-3 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {totalValue > 0 && (
                      <div className="mb-2">
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${config.bar}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-zinc-400 tabular-nums">
                            ${used.toFixed(2)} used
                          </span>
                          <span className="text-[10px] text-zinc-400 tabular-nums">
                            ${remaining.toFixed(2)} of ${totalValue.toFixed(0)} remaining
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Edit used amount */}
                    {totalValue > 0 && (
                      <div className="mt-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={totalValue}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(key, totalValue);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="w-24 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
                              placeholder="0.00"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(key, totalValue)}
                              className="rounded bg-zinc-900 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-zinc-800 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="rounded bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(key, used)}
                            className="text-[10px] font-medium text-violet-600 hover:text-violet-700 transition-colors"
                          >
                            Update used amount
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Utility: Parse card perks from the card database into trackable benefits.
 * Only includes perks that have a dollar value (e.g., "$300 annual travel credit").
 * Non-monetary perks (e.g., "Airport Lounge Access") are included without a progress bar.
 */
export function parseCardBenefits(
  cards: Array<{
    id: string;
    name: string;
    dbPerks: string[];
  }>
): CardBenefit[] {
  const now = new Date();
  // Default reset date is end of current year
  const defaultResetDate = new Date(now.getFullYear(), 11, 31).toISOString();

  return cards
    .filter(card => card.dbPerks.length > 0)
    .map(card => ({
      cardName: card.name,
      cardId: card.id,
      perks: card.dbPerks.map(perkStr => ({
        name: perkStr,
        annualValue: extractDollarAmount(perkStr),
        resetDate: defaultResetDate,
      })),
    }));
}
