"use client";

import { useState } from "react";

interface RetailerWithStatus {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  authMethod: string;
  description: string;
  dataTypes: string[];
  popular: boolean;
  connected: boolean;
  connectionId: string | null;
  lastSyncAt: string | null;
  receiptCount: number;
}

const CATEGORIES = [
  { id: "all", name: "All", icon: "🌐" },
  { id: "popular", name: "Popular", icon: "⭐" },
  { id: "grocery", name: "Grocery", icon: "🛒" },
  { id: "general", name: "General", icon: "🏪" },
  { id: "food-delivery", name: "Food Delivery", icon: "🍔" },
  { id: "rideshare", name: "Rideshare", icon: "🚗" },
  { id: "fast-food", name: "Fast Food", icon: "🍟" },
  { id: "coffee", name: "Coffee", icon: "☕" },
  { id: "pharmacy", name: "Pharmacy", icon: "💊" },
  { id: "home-improvement", name: "Home", icon: "🔨" },
  { id: "electronics", name: "Electronics", icon: "🖥️" },
  { id: "wholesale", name: "Wholesale", icon: "🏬" },
  { id: "digital", name: "Digital", icon: "📱" },
];

export function ConnectionsGrid({ catalog }: { catalog: RetailerWithStatus[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [syncing, setSyncing] = useState<string | null>(null);

  const filtered = catalog.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all"
      ? true
      : category === "popular"
        ? r.popular
        : r.category === category;
    return matchSearch && matchCat;
  });

  const connected = filtered.filter((r) => r.connected);
  const available = filtered.filter((r) => !r.connected);

  const handleConnect = (retailerId: string, authMethod: string) => {
    if (authMethod === "oauth") {
      window.location.href = `/api/connectors/${retailerId}/connect`;
    } else if (authMethod === "session_token" || authMethod === "browser_session") {
      window.location.href = `/connect/${retailerId}`;
    } else if (authMethod === "email") {
      window.location.href = `/api/email/connect`;
    } else {
      window.location.href = `/connect/${retailerId}`;
    }
  };

  const handleSync = async (retailerId: string) => {
    setSyncing(retailerId);
    try {
      await fetch("/api/mobile/retailers/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retailer: retailerId }),
      });
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setTimeout(() => setSyncing(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Search retailers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                category === cat.id
                  ? "bg-neutral-900 text-white"
                  : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Connected Section */}
      {connected.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide mb-3">
            Connected ({connected.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {connected.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-green-200 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${r.color}15` }}
                >
                  {r.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-neutral-900 truncate">{r.name}</div>
                  <div className="text-xs text-neutral-400">
                    {r.receiptCount} receipts
                    {r.lastSyncAt && ` • ${formatTimeAgo(r.lastSyncAt)}`}
                  </div>
                </div>
                <button
                  onClick={() => handleSync(r.id)}
                  disabled={syncing === r.id}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                >
                  {syncing === r.id ? "..." : "Sync"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Section */}
      <div>
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wide mb-3">
          Available ({available.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {available.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-neutral-200 p-4 hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${r.color}15` }}
                >
                  {r.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-neutral-900 truncate">{r.name}</div>
                  <div className="text-xs text-neutral-400 truncate">{r.description}</div>
                </div>
                <button
                  onClick={() => handleConnect(r.id, r.authMethod)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
                >
                  Connect
                </button>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {r.dataTypes.slice(0, 4).map((dt) => (
                  <span
                    key={dt}
                    className="px-2 py-0.5 bg-neutral-100 rounded text-[10px] text-neutral-500"
                  >
                    {dt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-neutral-400">
          No retailers found{search ? ` matching "${search}"` : ""}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
