"use client";

import { useState } from "react";
import { addCardWithPreset, addCard } from "@/lib/actions/cards";

const POPULAR_CARDS = [
  { preset: "chase-sapphire-preferred", name: "Chase Sapphire Preferred", network: "visa", highlights: "3x Dining, 2x Travel" },
  { preset: "chase-sapphire-reserve", name: "Chase Sapphire Reserve", network: "visa", highlights: "3x Dining/Travel" },
  { preset: "amex-gold", name: "Amex Gold", network: "amex", highlights: "4x Dining/Groceries" },
  { preset: "amex-platinum", name: "Amex Platinum", network: "amex", highlights: "5x Travel" },
  { preset: "capital-one-savor", name: "Capital One SavorOne", network: "visa", highlights: "4x Dining/Entertainment" },
  { preset: "chase-freedom-unlimited", name: "Chase Freedom Unlimited", network: "visa", highlights: "3x Dining, 1.5x All" },
  { preset: "citi-double-cash", name: "Citi Double Cash", network: "mastercard", highlights: "2% everything" },
  { preset: "discover-it", name: "Discover it", network: "discover", highlights: "5% rotating, 1% all" },
];

export function AddCardForm() {
  const [mode, setMode] = useState<"closed" | "preset" | "custom">("closed");

  if (mode === "closed") {
    return (
      <div className="flex gap-3">
        <button
          onClick={() => setMode("preset")}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Popular Card
        </button>
        <button
          onClick={() => setMode("custom")}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Custom Card
        </button>
      </div>
    );
  }

  if (mode === "preset") {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-zinc-900">Choose Your Card</h2>
          <button onClick={() => setMode("closed")} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {POPULAR_CARDS.map((card) => (
            <PresetCardButton key={card.preset} card={card} onDone={() => setMode("closed")} />
          ))}
        </div>
        <button
          onClick={() => setMode("custom")}
          className="mt-4 w-full rounded-xl border-2 border-dashed border-zinc-200 py-3 text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 transition-colors"
        >
          + Add a custom card instead
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-zinc-900">Add Custom Card</h2>
        <button onClick={() => setMode("closed")} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
      </div>
      <form action={async (fd) => { await addCard(fd); setMode("closed"); }} className="flex gap-3 flex-wrap">
        <input
          name="name"
          placeholder="Card name (e.g., Chase Freedom)"
          required
          className="flex-1 min-w-[200px] rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
        />
        <input
          name="last4"
          placeholder="Last 4"
          required
          maxLength={4}
          pattern="\d{4}"
          className="w-20 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
        />
        <select name="network" className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100">
          <option value="visa">Visa</option>
          <option value="mastercard">Mastercard</option>
          <option value="amex">Amex</option>
          <option value="discover">Discover</option>
          <option value="other">Other</option>
        </select>
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          Add Card
        </button>
      </form>
    </div>
  );
}

function PresetCardButton({ card, onDone }: { card: typeof POPULAR_CARDS[number]; onDone: () => void }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-left p-4 rounded-xl border border-zinc-200 hover:border-violet-200 hover:bg-violet-50/30 transition-all group"
      >
        <p className="text-sm font-medium text-zinc-900 group-hover:text-violet-900">{card.name}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{card.highlights}</p>
      </button>
    );
  }

  return (
    <form
      action={async (fd) => { await addCardWithPreset(fd); onDone(); }}
      className="p-4 rounded-xl border-2 border-violet-200 bg-violet-50/30"
    >
      <input type="hidden" name="name" value={card.name} />
      <input type="hidden" name="network" value={card.network} />
      <input type="hidden" name="preset" value={card.preset} />
      <p className="text-sm font-medium text-violet-900 mb-2">{card.name}</p>
      <input
        name="last4"
        placeholder="Last 4 digits"
        required
        maxLength={4}
        pattern="\d{4}"
        autoFocus
        className="w-full rounded-lg border border-violet-200 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 mb-2"
      />
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700">
          Add with Rewards
        </button>
        <button type="button" onClick={() => setExpanded(false)} className="text-xs text-zinc-400 hover:text-zinc-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
