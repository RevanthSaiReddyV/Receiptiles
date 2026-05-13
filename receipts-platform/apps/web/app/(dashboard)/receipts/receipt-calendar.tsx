"use client";

import { useState, useMemo } from "react";
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

interface Subscription {
  merchantName: string;
  amount: number;
  frequency: string;
  confidence: number;
  category: string | null;
  nextExpectedAt: string;
  firstChargeAt: string;
  lastChargeAt: string;
}

const CATEGORY_DOT: Record<string, string> = {
  Shopping: "bg-violet-500",
  Dining: "bg-amber-500",
  Groceries: "bg-emerald-500",
  Transportation: "bg-blue-500",
  Subscriptions: "bg-fuchsia-500",
  Electronics: "bg-cyan-500",
  Entertainment: "bg-pink-500",
  Uncategorized: "bg-zinc-400",
};

const CATEGORY_BADGE: Record<string, string> = {
  Shopping: "bg-violet-50 text-violet-700",
  Dining: "bg-amber-50 text-amber-700",
  Groceries: "bg-emerald-50 text-emerald-700",
  Transportation: "bg-blue-50 text-blue-700",
  Subscriptions: "bg-fuchsia-50 text-fuchsia-700",
  Electronics: "bg-cyan-50 text-cyan-700",
  Entertainment: "bg-pink-50 text-pink-700",
  Uncategorized: "bg-zinc-100 text-zinc-600",
};

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUAL: "Annual",
};

const FREQUENCY_DAYS: Record<string, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 30,
  QUARTERLY: 91,
  ANNUAL: 365,
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Given a subscription, generate all expected charge dates that fall within the
 * visible calendar month (year/month). We project forward from nextExpectedAt
 * and also backward from lastChargeAt using the frequency interval.
 */
function getSubscriptionDatesForMonth(
  sub: Subscription,
  year: number,
  month: number
): string[] {
  const intervalDays = FREQUENCY_DAYS[sub.frequency] ?? 30;
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const dates: string[] = [];

  // Project from nextExpectedAt forward and backward
  const anchor = new Date(sub.nextExpectedAt);
  const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

  // Go backward from anchor to find earliest relevant date
  let cursor = new Date(anchor.getTime());
  while (cursor.getTime() > monthStart.getTime() - intervalMs) {
    cursor = new Date(cursor.getTime() - intervalMs);
  }

  // Now walk forward and collect dates in the month
  while (cursor.getTime() <= monthEnd.getTime() + intervalMs) {
    if (cursor >= monthStart && cursor <= monthEnd) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      dates.push(key);
    }
    cursor = new Date(cursor.getTime() + intervalMs);
  }

  // Also include the nextExpectedAt itself if in range
  if (anchor >= monthStart && anchor <= monthEnd) {
    const anchorKey = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(anchor.getDate()).padStart(2, "0")}`;
    if (!dates.includes(anchorKey)) {
      dates.push(anchorKey);
    }
  }

  return dates;
}

function RecurringIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      strokeWidth={1.8}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 8a5.5 5.5 0 01-9.27 4M2.5 8a5.5 5.5 0 019.27-4"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.23 12l.01-2.5H1.7M11.77 4l-.01 2.5h2.54"
      />
    </svg>
  );
}

export function ReceiptCalendar({
  receipts,
  subscriptions = [],
}: {
  receipts: Receipt[];
  subscriptions?: Subscription[];
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");

  // Group receipts by date string (YYYY-MM-DD)
  const receiptsByDate = useMemo(() => {
    const map = new Map<string, Receipt[]>();
    for (const r of receipts) {
      const d = new Date(r.purchasedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [receipts]);

  // Group subscriptions by expected date for the current month
  const subscriptionsByDate = useMemo(() => {
    const map = new Map<string, Subscription[]>();
    const { year, month } = currentMonth;
    for (const sub of subscriptions) {
      const dates = getSubscriptionDatesForMonth(sub, year, month);
      for (const dateKey of dates) {
        if (!map.has(dateKey)) map.set(dateKey, []);
        // Avoid duplicates for the same merchant on the same day
        const existing = map.get(dateKey)!;
        if (!existing.some(s => s.merchantName === sub.merchantName)) {
          existing.push(sub);
        }
      }
    }
    return map;
  }, [subscriptions, currentMonth]);

  // Calendar grid
  const { year, month } = currentMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const calendarDays: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({ day: d, key });
  }

  const selectedReceipts = selectedDate ? (receiptsByDate.get(selectedDate) ?? []) : [];
  const selectedSubscriptions = selectedDate ? (subscriptionsByDate.get(selectedDate) ?? []) : [];
  const monthTotal = Array.from(receiptsByDate.entries())
    .filter(([key]) => key.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .reduce((sum, [, rs]) => sum + rs.reduce((s, r) => s + r.total, 0), 0);
  const monthCount = Array.from(receiptsByDate.entries())
    .filter(([key]) => key.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .reduce((sum, [, rs]) => sum + rs.length, 0);

  return (
    <div>
      {/* View toggle + month stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="bg-zinc-100 rounded-lg p-0.5 flex">
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "calendar" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "list" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
            >
              List
            </button>
          </div>
          <span className="text-xs text-zinc-400">
            {monthCount} receipt{monthCount !== 1 ? "s" : ""} &middot; ${monthTotal.toFixed(2)} this month
          </span>
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => setCurrentMonth(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 })}
                className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h2 className="text-sm font-semibold text-zinc-900">
                {MONTHS[month]} {year}
              </h2>
              <button
                onClick={() => setCurrentMonth(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 })}
                className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <svg className="w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-zinc-400 uppercase tracking-wider py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-zinc-100 rounded-xl overflow-hidden">
              {calendarDays.map((cell, i) => {
                if (!cell) return <div key={`empty-${i}`} className="bg-zinc-50 min-h-[72px]" />;

                const dayReceipts = receiptsByDate.get(cell.key) ?? [];
                const daySubs = subscriptionsByDate.get(cell.key) ?? [];
                const isToday = cell.key === todayKey;
                const isSelected = cell.key === selectedDate;
                const hasReceipts = dayReceipts.length > 0;
                const hasSubs = daySubs.length > 0;
                const dayTotal = dayReceipts.reduce((s, r) => s + r.total, 0);

                return (
                  <button
                    key={cell.key}
                    onClick={() => setSelectedDate(isSelected ? null : cell.key)}
                    className={`min-h-[72px] p-1.5 text-left transition-colors relative ${
                      isSelected ? "bg-violet-50" : (hasReceipts || hasSubs) ? "bg-white hover:bg-zinc-50" : "bg-white"
                    }`}
                  >
                    <span className={`text-xs font-medium ${
                      isToday ? "bg-zinc-900 text-white w-6 h-6 rounded-full flex items-center justify-center" :
                      isSelected ? "text-violet-700" :
                      "text-zinc-700"
                    }`}>
                      {cell.day}
                    </span>

                    {(hasReceipts || hasSubs) && (
                      <div className="mt-1">
                        <div className="flex gap-0.5 flex-wrap items-center">
                          {dayReceipts.slice(0, 3).map((r, j) => (
                            <div
                              key={j}
                              className={`w-1.5 h-1.5 rounded-full ${CATEGORY_DOT[r.merchantCategory] ?? "bg-zinc-400"}`}
                            />
                          ))}
                          {dayReceipts.length > 3 && (
                            <span className="text-[8px] text-zinc-400">+{dayReceipts.length - 3}</span>
                          )}
                          {hasSubs && (
                            <RecurringIcon className="w-3 h-3 text-fuchsia-500 ml-0.5" />
                          )}
                        </div>
                        {hasReceipts && (
                          <p className="text-[10px] font-medium text-zinc-500 mt-0.5 tabular-nums">
                            ${dayTotal.toFixed(0)}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Subscription legend */}
            {subscriptions.length > 0 && (
              <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-400">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  <span>Receipt</span>
                </div>
                <div className="flex items-center gap-1">
                  <RecurringIcon className="w-3 h-3 text-fuchsia-500" />
                  <span>Recurring charge</span>
                </div>
              </div>
            )}
          </div>

          {/* Selected day detail */}
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900">
                {selectedDate ? formatDateDisplay(selectedDate) : "Select a day"}
              </h3>
              {selectedReceipts.length > 0 && (
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedReceipts.length} receipt{selectedReceipts.length !== 1 ? "s" : ""} &middot; $
                  {selectedReceipts.reduce((s, r) => s + r.total, 0).toFixed(2)}
                </p>
              )}
            </div>

            {!selectedDate ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-zinc-400">Click a day on the calendar</p>
                <p className="text-xs text-zinc-300 mt-1">Days with dots have receipts</p>
              </div>
            ) : (selectedReceipts.length === 0 && selectedSubscriptions.length === 0) ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-zinc-400">No receipts on this day</p>
              </div>
            ) : (
              <div>
                {/* Receipts section */}
                {selectedReceipts.length > 0 && (
                  <div className="divide-y divide-zinc-50">
                    {selectedReceipts.map(r => (
                      <Link
                        key={r.id}
                        href={`/receipts/${r.id}`}
                        className="block px-5 py-3.5 hover:bg-zinc-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-8 rounded-full ${CATEGORY_DOT[r.merchantCategory] ?? "bg-zinc-400"}`} />
                            <div>
                              <p className="text-sm font-medium text-zinc-900">{r.merchantCanonicalName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium ${CATEGORY_BADGE[r.merchantCategory] ?? CATEGORY_BADGE.Uncategorized}`}>
                                  {r.merchantCategory}
                                </span>
                                {r.cardLast4 && (
                                  <span className="text-[10px] text-zinc-400 font-mono">****{r.cardLast4}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-zinc-900 tabular-nums">${r.total.toFixed(2)}</span>
                            <p className="text-[9px] text-zinc-400 uppercase">{r.source}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Subscriptions section */}
                {selectedSubscriptions.length > 0 && (
                  <div>
                    {selectedReceipts.length > 0 && (
                      <div className="border-t border-zinc-100" />
                    )}
                    <div className="px-5 py-2.5 bg-fuchsia-50/50">
                      <div className="flex items-center gap-1.5">
                        <RecurringIcon className="w-3.5 h-3.5 text-fuchsia-600" />
                        <span className="text-[10px] font-semibold text-fuchsia-700 uppercase tracking-wider">
                          Expected Recurring Charges
                        </span>
                      </div>
                    </div>
                    <div className="divide-y divide-zinc-50">
                      {selectedSubscriptions.map((sub, idx) => (
                        <div
                          key={`sub-${idx}`}
                          className="px-5 py-3.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-8 rounded-full bg-fuchsia-500" />
                              <div>
                                <p className="text-sm font-medium text-zinc-900">{sub.merchantName}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-fuchsia-50 text-fuchsia-700">
                                    {FREQUENCY_LABELS[sub.frequency] ?? sub.frequency}
                                  </span>
                                  {sub.category && (
                                    <span className="text-[10px] text-zinc-400">{sub.category}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-fuchsia-700 tabular-nums">${sub.amount.toFixed(2)}</span>
                              <p className="text-[9px] text-zinc-400">
                                Next: {new Date(sub.nextExpectedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden divide-y divide-zinc-100">
          {receipts.map((r) => (
            <Link
              key={r.id}
              href={`/receipts/${r.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-1.5 h-10 rounded-full ${CATEGORY_DOT[r.merchantCategory] ?? "bg-zinc-400"}`} />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{r.merchantCanonicalName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400">
                      {new Date(r.purchasedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_BADGE[r.merchantCategory] ?? CATEGORY_BADGE.Uncategorized}`}>
                      {r.merchantCategory}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-sm font-semibold text-zinc-900 tabular-nums">${r.total.toFixed(2)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDateDisplay(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
