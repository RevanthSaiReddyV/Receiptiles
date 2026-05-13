"use client";

import { useState } from "react";

interface FlipCardProps {
  cardName: string;
  last4: string;
  network: string;
  issuer: string;
  imageUrl: string | null;
  rewards: Array<{
    id: string;
    category: string | null;
    merchantName: string | null;
    rewardRate: number;
    rewardType: string;
  }>;
  perks: string[];
  annualFee: number | null;
  topRate: number | null;
  gradientBg: string;
}

export function FlipCard({
  cardName, last4, network, issuer, imageUrl,
  rewards, perks, annualFee, topRate, gradientBg,
}: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="cursor-pointer"
      style={{ perspective: "1000px" }}
      onClick={() => setFlipped(f => !f)}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          aspectRatio: "3.375 / 2.125",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden shadow-lg"
          style={{ backfaceVisibility: "hidden" }}
        >
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={cardName}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.querySelector(".css-fallback")?.classList.remove("hidden");
                }}
              />
              <div className="css-fallback hidden absolute inset-0 bg-gradient-to-br ${gradientBg}" />
            </>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${gradientBg}`} />
          )}
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
          <div className="absolute inset-0 p-4 flex flex-col justify-end">
            <p className="text-white/90 font-mono text-xs tracking-[0.15em] drop-shadow">
              •••• {last4}
            </p>
            <p className="text-white text-[11px] font-semibold mt-1 drop-shadow">{cardName}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-white/50 text-[9px]">{issuer}</p>
              {topRate && (
                <span className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-[9px] font-bold text-white">
                  {topRate}%
                </span>
              )}
            </div>
          </div>
          {/* Tap hint */}
          <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm rounded-full p-1">
            <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
          </div>
        </div>

        {/* BACK — Rewards */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden shadow-lg bg-white border border-zinc-200"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="h-full flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">Rewards</h3>
              {annualFee !== null && (
                <span className="text-[9px] text-zinc-400">
                  {annualFee === 0 ? "No annual fee" : `$${annualFee}/yr`}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {rewards.length > 0 ? (
                rewards.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span className="w-8 h-4 rounded bg-emerald-100 flex items-center justify-center text-[8px] font-bold text-emerald-700 flex-shrink-0">
                      {r.rewardRate}%
                    </span>
                    <span className="text-[10px] text-zinc-700 truncate">
                      {r.rewardType} {r.merchantName ? `at ${r.merchantName}` : r.category ? `on ${r.category}` : "on all"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-zinc-400">No rules added</p>
              )}
            </div>

            {perks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-100">
                <div className="flex flex-wrap gap-1">
                  {perks.slice(0, 3).map((perk, i) => (
                    <span key={i} className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-[8px] font-medium text-violet-700">
                      {perk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[8px] text-zinc-300 mt-1 text-center">Tap to flip back</p>
          </div>
        </div>
      </div>
    </div>
  );
}
