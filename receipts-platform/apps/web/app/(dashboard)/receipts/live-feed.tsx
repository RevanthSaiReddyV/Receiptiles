"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Receipt {
  id: string;
  merchantCanonicalName: string;
  merchantCategory: string;
  total: number;
  purchasedAt: string;
  source: string;
  cardLast4: string | null;
  requiresReview: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string; glow: string }> = {
  Shopping: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", glow: "shadow-violet-200" },
  Dining: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", glow: "shadow-amber-200" },
  Groceries: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", glow: "shadow-emerald-200" },
  Transportation: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", glow: "shadow-blue-200" },
  Subscriptions: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", dot: "bg-fuchsia-500", glow: "shadow-fuchsia-200" },
  Electronics: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500", glow: "shadow-cyan-200" },
  Entertainment: { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500", glow: "shadow-pink-200" },
  "Gas & Fuel": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", glow: "shadow-orange-200" },
  Healthcare: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", glow: "shadow-rose-200" },
  Uncategorized: { bg: "bg-zinc-50", text: "text-zinc-600", dot: "bg-zinc-400", glow: "shadow-zinc-200" },
};

const MERCHANT_ICONS: Record<string, string> = {
  Amazon: "A",
  Walmart: "W",
  Target: "T",
  Costco: "C",
  Starbucks: "S",
  "Uber Eats": "UE",
  DoorDash: "DD",
  Apple: "",
  Netflix: "N",
  Spotify: "S",
};

function getInitials(name: string): string {
  if (MERCHANT_ICONS[name]) return MERCHANT_ICONS[name];
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ReceiptCard({ receipt, isNew }: { receipt: Receipt; isNew: boolean }) {
  const colors = CATEGORY_COLORS[receipt.merchantCategory] ?? CATEGORY_COLORS.Uncategorized;

  return (
    <Link
      href={`/receipts/${receipt.id}`}
      className={`group block relative rounded-2xl border bg-white p-4 transition-all duration-500 hover:shadow-lg hover:-translate-y-0.5 ${
        isNew ? "animate-slide-in border-violet-200 shadow-md shadow-violet-100" : "border-zinc-100 shadow-sm"
      }`}
    >
      {isNew && (
        <div className="absolute -top-1.5 -right-1.5 z-10">
          <span className="flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-violet-500"></span>
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Merchant avatar */}
        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
          <span className={`text-sm font-bold ${colors.text}`}>{getInitials(receipt.merchantCanonicalName)}</span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 truncate">{receipt.merchantCanonicalName}</h3>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text}`}>
              {receipt.merchantCategory}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-400">{getRelativeTime(receipt.purchasedAt)}</span>
            {receipt.cardLast4 && (
              <span className="text-[10px] text-zinc-300 font-mono">****{receipt.cardLast4}</span>
            )}
            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium ${
              receipt.source === "EMAIL" ? "bg-blue-50 text-blue-600" :
              receipt.source === "UPLOAD" ? "bg-amber-50 text-amber-600" :
              receipt.source === "POS" ? "bg-emerald-50 text-emerald-600" :
              "bg-zinc-50 text-zinc-500"
            }`}>
              {receipt.source.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <span className="text-base font-bold text-zinc-900 tabular-nums">${receipt.total.toFixed(2)}</span>
        </div>
      </div>
    </Link>
  );
}

function SpendingPulse({ receipts }: { receipts: Receipt[] }) {
  const todayTotal = receipts
    .filter(r => {
      const d = new Date(r.purchasedAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    })
    .reduce((sum, r) => sum + r.total, 0);

  const weekTotal = receipts
    .filter(r => {
      const d = new Date(r.purchasedAt);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    })
    .reduce((sum, r) => sum + r.total, 0);

  const categories = receipts.reduce((acc, r) => {
    acc[r.merchantCategory] = (acc[r.merchantCategory] ?? 0) + r.total;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const maxCatValue = topCategories[0]?.[1] ?? 1;

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Spending Pulse</h3>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-white p-4 border border-violet-100">
          <p className="text-[10px] font-medium text-violet-600 uppercase tracking-wider">Today</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums mt-1">${todayTotal.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white p-4 border border-emerald-100">
          <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">This Week</p>
          <p className="text-2xl font-bold text-zinc-900 tabular-nums mt-1">${weekTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {topCategories.map(([cat, amount]) => {
          const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Uncategorized;
          const pct = (amount / maxCatValue) * 100;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-zinc-700">{cat}</span>
                <span className="text-xs font-semibold text-zinc-900 tabular-nums">${amount.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors.dot} transition-all duration-1000 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LiveReceiptsFeed({ initialReceipts }: { initialReceipts: Receipt[] }) {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "week">("all");
  const lastCheckRef = useRef<string>(initialReceipts[0]?.purchasedAt ?? new Date().toISOString());
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const pollForNew = useCallback(async () => {
    try {
      const res = await fetch(`/api/mobile/receipts?since=${encodeURIComponent(lastCheckRef.current)}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.receipts && data.receipts.length > 0) {
        const newReceipts = data.receipts.map((r: { id: string; merchantCanonicalName: string; merchantCategory: string; total: number; purchasedAt: string; source: string; cardLast4: string | null; requiresReview: boolean }) => ({
          ...r,
          purchasedAt: r.purchasedAt,
        }));
        const existingIds = new Set(receipts.map(r => r.id));
        const truly_new = newReceipts.filter((r: Receipt) => !existingIds.has(r.id));
        if (truly_new.length > 0) {
          setNewIds(prev => {
            const next = new Set(prev);
            truly_new.forEach((r: Receipt) => next.add(r.id));
            return next;
          });
          setReceipts(prev => [...truly_new, ...prev]);
          lastCheckRef.current = truly_new[0].purchasedAt;
          setTimeout(() => {
            setNewIds(prev => {
              const next = new Set(prev);
              truly_new.forEach((r: Receipt) => next.delete(r.id));
              return next;
            });
          }, 5000);
        }
      }
    } catch {}
  }, [receipts]);

  useEffect(() => {
    if (isLive) {
      pollRef.current = setInterval(pollForNew, 10000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [isLive, pollForNew]);

  const filteredReceipts = receipts.filter(r => {
    if (filter === "all") return true;
    const d = new Date(r.purchasedAt);
    const now = new Date();
    if (filter === "today") return d.toDateString() === now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main feed */}
      <div className="lg:col-span-2 space-y-3">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-100 rounded-lg p-0.5 flex">
              {(["all", "today", "week"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === f ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {f === "all" ? "All" : f === "today" ? "Today" : "Week"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isLive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-zinc-100 text-zinc-500 border border-zinc-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
            {isLive ? "Live" : "Paused"}
          </button>
        </div>

        {/* Receipt cards */}
        {filteredReceipts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-16 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-zinc-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 font-medium">No receipts in this period</p>
            <p className="text-xs text-zinc-400 mt-1">Receipts will appear here as they arrive</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReceipts.map(r => (
              <ReceiptCard key={r.id} receipt={r} isNew={newIds.has(r.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <SpendingPulse receipts={receipts} />

        {/* Quick stats */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600">Total receipts</span>
              <span className="text-sm font-bold text-zinc-900">{receipts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600">Avg per receipt</span>
              <span className="text-sm font-bold text-zinc-900">
                ${receipts.length > 0 ? (receipts.reduce((s, r) => s + r.total, 0) / receipts.length).toFixed(2) : "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-600">Sources</span>
              <div className="flex gap-1">
                {Array.from(new Set(receipts.map(r => r.source))).slice(0, 3).map(s => (
                  <span key={s} className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium bg-zinc-50 text-zinc-600">{s.toLowerCase()}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
