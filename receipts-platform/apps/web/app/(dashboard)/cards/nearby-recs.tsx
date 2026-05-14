"use client";

import { useState, useMemo } from "react";
import { findBestCard, CARD_DATABASE } from "@/lib/rewards/card-database";

interface NearbyMerchant {
  name: string;
  address: string;
  category: string;
  rewardCategory: string;
  rating?: number;
}

interface UserCard {
  id: string;
  name: string;
  dbId: string | null;
}

const CATEGORIES: Array<{ id: string; label: string; icon: string; color: string; badge: string }> = [
  { id: "all", label: "All", icon: "📍", color: "bg-zinc-100", badge: "bg-zinc-100 text-zinc-700" },
  { id: "Dining", label: "Dining", icon: "🍽️", color: "bg-amber-50", badge: "bg-amber-100 text-amber-700" },
  { id: "Groceries", label: "Groceries", icon: "🛒", color: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
  { id: "Gas", label: "Gas", icon: "⛽", color: "bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  { id: "Shopping", label: "Shopping", icon: "🛍️", color: "bg-violet-50", badge: "bg-violet-100 text-violet-700" },
  { id: "Drugstores", label: "Health", icon: "💊", color: "bg-pink-50", badge: "bg-pink-100 text-pink-700" },
  { id: "Entertainment", label: "Fun", icon: "🎬", color: "bg-fuchsia-50", badge: "bg-fuchsia-100 text-fuchsia-700" },
  { id: "Hotels", label: "Hotels", icon: "🏨", color: "bg-indigo-50", badge: "bg-indigo-100 text-indigo-700" },
  { id: "Travel", label: "Travel", icon: "✈️", color: "bg-sky-50", badge: "bg-sky-100 text-sky-700" },
  { id: "Fitness", label: "Fitness", icon: "🏋️", color: "bg-orange-50", badge: "bg-orange-100 text-orange-700" },
];

const CATEGORY_ICONS: Record<string, string> = {
  Dining: "🍽️", Groceries: "🛒", Gas: "⛽", Shopping: "🛍️",
  Drugstores: "💊", Entertainment: "🎬", Hotels: "🏨", Travel: "✈️",
  Fitness: "🏋️", Electronics: "💻", Transit: "🚌",
};

export function NearbyRecommendations({ userCards }: { userCards: UserCard[] }) {
  const [merchants, setMerchants] = useState<NearbyMerchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  async function requestLocation() {
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      setLocationGranted(true);
      const { latitude, longitude } = pos.coords;
      const res = await fetch(`/api/nearby-merchants?lat=${latitude}&lng=${longitude}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMerchants(data.merchants ?? []);
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        setError("Location access denied. Enable location in your browser settings.");
      } else {
        setError("Could not find nearby merchants.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function searchMerchants(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // Use the existing nearby API but with a text search
      const res = await fetch(`/api/merchant-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setMerchants(data.merchants ?? []);
      setLocationGranted(true);
    } catch {
      setError("Search failed. Try enabling location instead.");
    } finally {
      setLoading(false);
    }
  }

  const dbCardIds = userCards.map(c => c.dbId).filter(Boolean) as string[];

  // Filter merchants
  const filtered = useMemo(() => {
    let result = merchants;
    if (activeCategory !== "all") {
      result = result.filter(m => m.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    return result;
  }, [merchants, activeCategory, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, NearbyMerchant[]>();
    for (const m of filtered) {
      if (!map.has(m.category)) map.set(m.category, []);
      map.get(m.category)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  // Category counts for filter pills
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: merchants.length };
    for (const m of merchants) {
      counts[m.category] = (counts[m.category] ?? 0) + 1;
    }
    return counts;
  }, [merchants]);

  // ── Not yet loaded ──
  if (!locationGranted && merchants.length === 0) {
    return (
      <div className="space-y-4">
        {/* Search bar */}
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Find Merchants</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchMerchants(search)}
                placeholder="Search merchants (e.g., Starbucks, Target)..."
                className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <button
              onClick={() => searchMerchants(search)}
              disabled={loading || !search.trim()}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Search
            </button>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <div className="h-px flex-1 bg-zinc-100" />
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-zinc-100" />
          </div>

          <button
            onClick={requestLocation}
            disabled={loading}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Finding nearby...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                </svg>
                Use My Location
              </>
            )}
          </button>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-8 text-center">
        <svg className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-xs text-zinc-500">Finding merchants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + refresh */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && search.trim()) searchMerchants(search);
              }}
              placeholder="Filter or search merchants..."
              className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-100"
            />
          </div>
          <button
            onClick={requestLocation}
            className="rounded-xl border border-zinc-200 px-3 py-2 text-zinc-500 hover:bg-zinc-50 transition-colors"
            title="Refresh location"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>

        {/* Category filter pills */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.filter(c => c.id === "all" || (categoryCounts[c.id] ?? 0) > 0).map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? "bg-zinc-900 text-white"
                  : `${cat.color} text-zinc-700 hover:bg-zinc-100`
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
              {(categoryCounts[cat.id] ?? 0) > 0 && (
                <span className={`ml-0.5 text-[9px] ${activeCategory === cat.id ? "text-zinc-400" : "text-zinc-500"}`}>
                  {categoryCounts[cat.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results grouped by category */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-8 text-center">
          <p className="text-sm text-zinc-400">No merchants found{activeCategory !== "all" ? ` in ${activeCategory}` : ""}</p>
          {activeCategory !== "all" && (
            <button onClick={() => setActiveCategory("all")} className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-medium">
              Show all categories
            </button>
          )}
        </div>
      ) : activeCategory !== "all" ? (
        // Flat list when filtered to one category
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
          <div className="divide-y divide-zinc-50">
            {filtered.map((m, i) => (
              <MerchantRow key={i} merchant={m} dbCardIds={dbCardIds} />
            ))}
          </div>
        </div>
      ) : (
        // Grouped by category
        grouped.map(([category, categoryMerchants]) => {
          const catInfo = CATEGORIES.find(c => c.id === category);
          return (
            <div key={category} className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-100 flex items-center gap-2">
                <span className="text-base">{CATEGORY_ICONS[category] ?? "📍"}</span>
                <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">{category}</h3>
                <span className="text-[10px] text-zinc-400">{categoryMerchants.length}</span>
              </div>
              <div className="divide-y divide-zinc-50">
                {categoryMerchants.map((m, i) => (
                  <MerchantRow key={i} merchant={m} dbCardIds={dbCardIds} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function MerchantRow({ merchant, dbCardIds }: { merchant: NearbyMerchant; dbCardIds: string[] }) {
  const best = dbCardIds.length > 0 ? findBestCard(dbCardIds, 20, merchant.name) : null;
  const bestCard = best ? CARD_DATABASE.find(c => c.id === best.cardId) : null;

  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center flex-shrink-0">
        <span className="text-base">{CATEGORY_ICONS[merchant.category] ?? "📍"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900 truncate">{merchant.name}</p>
          {merchant.rating && (
            <span className="text-[10px] text-amber-500">★ {merchant.rating}</span>
          )}
        </div>
        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{merchant.address}</p>
      </div>
      <div className="text-right flex-shrink-0 min-w-[70px]">
        {bestCard ? (
          <div>
            <p className="text-[11px] font-bold text-emerald-600">{best!.rate}% back</p>
            <p className="text-[9px] text-zinc-400 truncate">{bestCard.name}</p>
          </div>
        ) : (
          <p className="text-[10px] text-zinc-300">Add cards</p>
        )}
      </div>
    </div>
  );
}
