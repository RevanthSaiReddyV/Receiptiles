"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

interface WalletCardProps {
  userName: string;
  userEmail: string;
  receiptCount: number;
  totalSpent: number;
  treesSaved: number;
  paperSaved: number;
  co2Saved: number;
  connectedSources: number;
  memberSince: string;
}

export function WalletCard(props: WalletCardProps) {
  const { userName, receiptCount, treesSaved, co2Saved, connectedSources, memberSince } = props;
  const [saving, setSaving] = useState(false);

  async function saveAsImage() {
    const el = document.getElementById("wallet-card");
    if (!el) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(el, { backgroundColor: "#f8f9fb", pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `receipts-wallet-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function shareCard() {
    const el = document.getElementById("wallet-card");
    if (!el) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(el, { backgroundColor: "#f8f9fb", pixelRatio: 3 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "receipts-wallet.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My eReceipt Wallet",
          text: `I've saved ${receiptCount} paper receipts! Join the paperless movement.`,
        });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        alert("Card copied to clipboard!");
      }
    } catch {
      // User cancelled share
    } finally {
      setSaving(false);
    }
  }

  const treesDisplay = treesSaved >= 1
    ? `${treesSaved.toFixed(1)} trees`
    : `${(treesSaved * 100).toFixed(0)}% of a tree`;

  return (
    <div>
      <div id="wallet-card" className="relative overflow-hidden rounded-3xl shadow-2xl">
        {/* Card background */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 pb-8">
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-[0.07]">
            <svg className="w-full h-full" viewBox="0 0 400 260">
              {Array.from({ length: 20 }).map((_, i) => (
                <circle key={i} cx={30 + (i % 5) * 90} cy={30 + Math.floor(i / 5) * 60} r="20" fill="white" />
              ))}
            </svg>
          </div>

          {/* Top section */}
          <div className="relative flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white text-sm font-bold">R</span>
                </div>
                <span className="text-white/80 text-xs font-semibold tracking-wider uppercase">eReceipts</span>
              </div>
              <p className="text-white text-lg font-bold mt-2">{userName}</p>
              <p className="text-white/50 text-[10px] uppercase tracking-widest mt-0.5">Member since {memberSince}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl">🌳</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="relative grid grid-cols-3 gap-4">
            <div>
              <p className="text-white text-2xl font-black tabular-nums">{receiptCount}</p>
              <p className="text-white/60 text-[10px] uppercase tracking-wider font-medium">eReceipts</p>
            </div>
            <div>
              <p className="text-white text-2xl font-black tabular-nums">{treesDisplay.split(" ")[0]}</p>
              <p className="text-white/60 text-[10px] uppercase tracking-wider font-medium">{treesDisplay.split(" ").slice(1).join(" ") || "Trees Saved"}</p>
            </div>
            <div>
              <p className="text-white text-2xl font-black tabular-nums">
                {co2Saved >= 1 ? co2Saved.toFixed(1) : (co2Saved * 1000).toFixed(0)}
              </p>
              <p className="text-white/60 text-[10px] uppercase tracking-wider font-medium">
                {co2Saved >= 1 ? "kg CO₂" : "g CO₂"}
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="relative mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/60 text-[10px]">{connectedSources} source{connectedSources !== 1 ? "s" : ""} connected</span>
            </div>
            <span className="text-white/40 text-[9px] font-mono">PAPERLESS</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={shareCard}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Share Impact
        </button>
        <button
          onClick={saveAsImage}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors shadow-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {saving ? "Saving..." : "Save Card"}
        </button>
      </div>
    </div>
  );
}
