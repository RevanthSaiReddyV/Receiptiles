import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { LocalDate } from "@/app/components/local-date";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [receiptCount, totalSpent, monthlyTotal, lastMonthTotal, recentReceipts, topCategories] = await Promise.all([
    db.receipt.count({ where: { userId } }),
    db.receipt.aggregate({ where: { userId }, _sum: { total: true } }),
    db.receipt.aggregate({ where: { userId, purchasedAt: { gte: startOfMonth } }, _sum: { total: true } }),
    db.receipt.aggregate({ where: { userId, purchasedAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { total: true } }),
    db.receipt.findMany({
      where: { userId },
      orderBy: { purchasedAt: "desc" },
      take: 8,
    }),
    db.receipt.groupBy({
      by: ["merchantCategory"],
      where: { userId, purchasedAt: { gte: startOfMonth } },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  const thisMonth = monthlyTotal._sum.total ?? 0;
  const lastMonth = lastMonthTotal._sum.total ?? 0;
  const monthDiff = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  const CATEGORY_COLORS: Record<string, string> = {
    Shopping: "bg-violet-500",
    Dining: "bg-amber-500",
    Groceries: "bg-emerald-500",
    Transportation: "bg-blue-500",
    Subscriptions: "bg-fuchsia-500",
    Electronics: "bg-cyan-500",
    Entertainment: "bg-pink-500",
    Uncategorized: "bg-zinc-400",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">
          Welcome back, {session!.user!.name?.split(" ")[0] || "there"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Here&apos;s your spending overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Receipts"
          value={receiptCount.toLocaleString()}
          icon={<ReceiptCountIcon />}
          accent="violet"
        />
        <StatCard
          label="Total Spent"
          value={`$${(totalSpent._sum.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarIcon />}
          accent="emerald"
        />
        <StatCard
          label="This Month"
          value={`$${thisMonth.toFixed(2)}`}
          trend={monthDiff}
          icon={<CalendarIcon />}
          accent="blue"
        />
        <StatCard
          label="Avg per Receipt"
          value={receiptCount > 0 ? `$${((totalSpent._sum.total ?? 0) / receiptCount).toFixed(2)}` : "$0.00"}
          icon={<AvgIcon />}
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent receipts */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="font-semibold text-zinc-900">Recent Receipts</h2>
            <Link href="/receipts" className="text-xs font-medium text-violet-600 hover:text-violet-700">
              View all
            </Link>
          </div>
          {recentReceipts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-zinc-400 text-sm">No receipts yet</p>
              <Link href="/settings" className="mt-3 inline-block text-sm font-medium text-violet-600 hover:text-violet-700">
                Connect your Gmail to start
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {recentReceipts.map((r) => (
                <Link
                  key={r.id}
                  href={`/receipts/${r.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${CATEGORY_COLORS[r.merchantCategory] ?? "bg-zinc-400"} bg-opacity-10 flex items-center justify-center`}>
                      <span className={`text-xs font-bold ${CATEGORY_COLORS[r.merchantCategory] ? "text-zinc-700" : "text-zinc-500"}`}>
                        {r.merchantCanonicalName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{r.merchantCanonicalName}</p>
                      <p className="text-xs text-zinc-400">
                        <LocalDate date={r.purchasedAt} />
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                    ${r.total.toFixed(2)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top categories */}
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="font-semibold text-zinc-900">Top Categories</h2>
            <p className="text-xs text-zinc-400 mt-0.5">This month</p>
          </div>
          {topCategories.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-zinc-400 text-sm">No data yet</p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-4">
              {topCategories.map((cat) => {
                const amount = cat._sum.total ?? 0;
                const maxAmount = topCategories[0]._sum.total ?? 1;
                const pct = (amount / maxAmount) * 100;
                return (
                  <div key={cat.merchantCategory}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-zinc-700">{cat.merchantCategory}</span>
                      <span className="text-xs font-semibold text-zinc-900 tabular-nums">${amount.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${CATEGORY_COLORS[cat.merchantCategory] ?? "bg-zinc-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, icon, accent }: {
  label: string;
  value: string;
  trend?: number;
  icon: React.ReactNode;
  accent: string;
}) {
  const accentBg: Record<string, string> = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentBg[accent]}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
      {trend !== undefined && trend !== 0 && (
        <p className={`mt-1 text-xs font-medium ${trend > 0 ? "text-red-500" : "text-emerald-500"}`}>
          {trend > 0 ? "+" : ""}{trend.toFixed(0)}% vs last month
        </p>
      )}
    </div>
  );
}

function ReceiptCountIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function AvgIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
    </svg>
  );
}
