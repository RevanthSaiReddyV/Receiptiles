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
  const [flipped, setFlipped] = useState(false);

  async function saveAsImage() {
    const el = document.getElementById("wallet-card-front");
    if (!el) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(el, { pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `allmyreceipts-card.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function shareCard() {
    const el = document.getElementById("wallet-card-front");
    if (!el) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(el, { pixelRatio: 3 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "allmyreceipts-card.png", { type: "image/png" });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "AllMyReceipts",
          text: `I've gone paperless with ${receiptCount} digital receipts! 🌳`,
        });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        alert("Card copied to clipboard!");
      }
    } catch {
      // cancelled
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Card with flip */}
      <div
        className="cursor-pointer mx-auto"
        style={{ perspective: "1200px", maxWidth: "400px" }}
        onClick={() => setFlipped(f => !f)}
      >
        <div
          className="relative w-full transition-transform duration-700"
          style={{
            aspectRatio: "3.375 / 2.125",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* ═══════════ FRONT ═══════════ */}
          <div
            id="wallet-card-front"
            className="absolute inset-0 rounded-[20px] overflow-hidden shadow-2xl"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111113] to-[#0a1a0f]" />

            {/* Subtle mesh pattern */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, #10b981 1px, transparent 1px),
                                radial-gradient(circle at 75% 75%, #8b5cf6 1px, transparent 1px)`,
              backgroundSize: "30px 30px",
            }} />

            {/* Green accent glow */}
            <div className="absolute top-[-30%] right-[-20%] w-[60%] h-[80%] rounded-full bg-emerald-500/8 blur-3xl" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[60%] rounded-full bg-violet-500/5 blur-3xl" />

            {/* Content */}
            <div className="relative h-full p-5 flex flex-col justify-between">
              {/* Top: Brand */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white text-[13px] font-bold tracking-wide">AllMyReceipts</p>
                      <p className="text-emerald-400/60 text-[8px] font-medium uppercase tracking-[0.25em]">Digital Wallet</p>
                    </div>
                  </div>
                </div>

                {/* NFC / Contactless */}
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <svg className="w-5 h-5 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Middle: Stats */}
              <div className="flex items-end gap-6">
                <div>
                  <p className="text-white text-3xl font-black tabular-nums leading-none">{receiptCount}</p>
                  <p className="text-white/40 text-[9px] font-semibold uppercase tracking-[0.2em] mt-1">eReceipts</p>
                </div>
                <div>
                  <p className="text-emerald-400 text-xl font-black tabular-nums leading-none">
                    {treesSaved >= 0.01 ? treesSaved.toFixed(2) : "0"}
                  </p>
                  <p className="text-emerald-400/50 text-[9px] font-semibold uppercase tracking-[0.2em] mt-1">Trees Saved</p>
                </div>
                <div>
                  <p className="text-violet-400 text-xl font-black tabular-nums leading-none">
                    {co2Saved >= 1 ? co2Saved.toFixed(1) : (co2Saved * 1000).toFixed(0)}
                  </p>
                  <p className="text-violet-400/50 text-[9px] font-semibold uppercase tracking-[0.2em] mt-1">
                    {co2Saved >= 1 ? "kg CO₂" : "g CO₂"}
                  </p>
                </div>
              </div>

              {/* Bottom: Member info */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/30 text-[8px] uppercase tracking-[0.2em]">Member</p>
                  <p className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">{userName}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/30 text-[8px] uppercase tracking-[0.2em]">Since</p>
                  <p className="text-white/60 text-[11px] font-mono">{memberSince}</p>
                </div>
              </div>
            </div>

            {/* Bottom edge line */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-500" />
          </div>

          {/* ═══════════ BACK ═══════════ */}
          <div
            className="absolute inset-0 rounded-[20px] overflow-hidden shadow-2xl bg-[#0a0a0a]"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {/* Magnetic stripe */}
            <div className="mt-6 h-10 bg-zinc-800" />

            <div className="p-5 pt-4">
              {/* Signature strip */}
              <div className="bg-zinc-100 rounded-md px-3 py-2 mb-4">
                <p className="text-zinc-800 text-[10px] font-mono italic">{userName}</p>
              </div>

              {/* Details */}
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Sources Connected</span>
                  <span className="text-white font-mono">{connectedSources}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Paper Receipts Eliminated</span>
                  <span className="text-white font-mono">{receiptCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Environmental Impact</span>
                  <span className="text-emerald-400 font-mono">
                    {treesSaved >= 0.01 ? `${treesSaved.toFixed(2)} trees` : `${receiptCount} sheets`}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800">
                <p className="text-zinc-600 text-[8px] text-center">
                  AllMyReceipts &middot; Save Trees, Use eReceipts
                </p>
                <p className="text-zinc-700 text-[7px] text-center mt-0.5">
                  allmyreceipts.com
                </p>
              </div>
            </div>

            {/* Bottom edge line */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-500" />
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-zinc-400 mt-3">Tap card to flip</p>

      {/* Action buttons */}
      <div className="mt-4 flex gap-3 max-w-[400px] mx-auto">
        <button
          onClick={(e) => { e.stopPropagation(); shareCard(); }}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Share
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); saveAsImage(); }}
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
