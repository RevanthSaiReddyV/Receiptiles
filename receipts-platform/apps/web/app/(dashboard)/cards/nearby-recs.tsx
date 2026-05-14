"use client";

import { useState, useEffect } from "react";
import { calculateReward, findBestCard, CARD_DATABASE } from "@/lib/rewards/card-database";

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

const CATEGORY_COLORS: Record<string, string> = {
  Dining: "bg-amber-100 text-amber-700",
  Groceries: "bg-emerald-100 text-emerald-700",
  Gas: "bg-blue-100 text-blue-700",
  Shopping: "bg-violet-100 text-violet-700",
  Electronics: "bg-cyan-100 text-cyan-700",
  Drugstores: "bg-pink-100 text-pink-700",
  Entertainment: "bg-fuchsia-100 text-fuchsia-700",
  Hotels: "bg-indigo-100 text-indigo-700",
  Travel: "bg-sky-100 text-sky-700",
  Fitness: "bg-orange-100 text-orange-700",
};

export function NearbyRecommendations({ userCards }: { userCards: UserCard[] }) {
  const [merchants, setMerchants] = useState<NearbyMerchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

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

  const dbCardIds = userCards.map(c => c.dbId).filter(Boolean) as string[];

  if (!locationGranted && merchants.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Nearby Recommendations</h2>
            <p className="text-[10px] text-zinc-400 mt-0.5">Best card for merchants around you</p>
          </div>
          <button
            onClick={requestLocation}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Finding...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                </svg>
                Enable Location
              </>
            )}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-8 text-center mb-6">
        <svg className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-xs text-zinc-500">Finding nearby merchants...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Nearby — Best Card to Use</h2>
          <p className="text-[10px] text-zinc-400 mt-0.5">{merchants.length} merchants within 500m</p>
        </div>
        <button
          onClick={requestLocation}
          className="text-[10px] text-violet-600 hover:text-violet-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {merchants.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-xs text-zinc-400">No merchants found nearby</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {merchants.map((m, i) => {
            const best = dbCardIds.length > 0
              ? findBestCard(dbCardIds, 20, m.name)
              : null;
            const bestCardName = best ? CARD_DATABASE.find(c => c.id === best.cardId)?.name : null;

            return (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-zinc-400">
                    {m.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 truncate">{m.name}</p>
                    {m.rating && (
                      <span className="text-[10px] text-zinc-400">★ {m.rating}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium ${CATEGORY_COLORS[m.category] ?? "bg-zinc-100 text-zinc-600"}`}>
                      {m.category}
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate">{m.address}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {bestCardName ? (
                    <div>
                      <p className="text-[10px] font-semibold text-emerald-600">{best!.rate}% back</p>
                      <p className="text-[9px] text-zinc-400 max-w-[80px] truncate">{bestCardName}</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-300">Add cards</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
