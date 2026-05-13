import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { getMissedRewards } from "@/lib/card-optimizer";
import { CategoryPieChart, MerchantBarChart, DailySpendChart } from "./charts";
import Link from "next/link";
import { LocalDate } from "@/app/components/local-date";

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [receiptCount, totalSpent, categorySpend, topMerchants, monthlyTotal, lastMonthTotal, missedRewards, dailyReceipts, recentReceipts] =
    await Promise.all([
      db.receipt.count({ where: { userId } }),
      db.receipt.aggregate({ where: { userId }, _sum: { total: true } }),
      db.receipt.groupBy({
        by: ["merchantCategory"],
        where: { userId, purchasedAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: "desc" } },
      }),
      db.receipt.groupBy({
        by: ["merchantCanonicalName"],
        where: { userId, purchasedAt: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
      db.receipt.aggregate({
        where: { userId, purchasedAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      db.receipt.aggregate({
        where: { userId, purchasedAt: { gte: startOfLastMonth, lt: startOfMonth } },
        _sum: { total: true },
      }),
      getMissedRewards(userId),
      db.receipt.findMany({
        where: { userId, purchasedAt: { gte: startOfMonth } },
        select: { purchasedAt: true, total: true },
        orderBy: { purchasedAt: "asc" },
      }),
      db.receipt.findMany({
        where: { userId },
        orderBy: { purchasedAt: "desc" },
        take: 5,
      }),
    ]);

  const thisMonth = monthlyTotal._sum.total ?? 0;
  const lastMonth = lastMonthTotal._sum.total ?? 0;
  const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  const dailyMap = new Map<string, number>();
  for (const r of dailyReceipts) {
    const day = new Date(r.purchasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + r.total);
  }
  const dailyData = Array.from(dailyMap, ([date, total]) => ({ date, total }));

  const categoryChartData = categorySpend.map((cat) => ({
    name: cat.merchantCategory ?? "Uncategorized",
    value: cat._sum.total ?? 0,
    count: cat._count,
  }));

  const merchantChartData = topMerchants.slice(0, 7).map((m) => ({
    name: m.merchantCanonicalName ?? "Unknown",
    total: m._sum.total ?? 0,
    visits: m._count,
  }));

  const CATEGORY_COLORS: Record<string, string> = {
    Shopping: "bg-violet-500",
    Dining: "bg-amber-500",
    Groceries: "bg-emerald-500",
    Transportation: "bg-blue-500",
    Subscriptions: "bg-fuchsia-500",
    Electronics: "bg-cyan-500",
    Uncategorized: "bg-zinc-400",
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">
          Welcome back, {session!.user!.name?.split(" ")[0] || "there"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Here&apos;s your spending overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Receipts" value={receiptCount.toLocaleString()} accent="violet" />
        <StatCard
          label="Total Spent"
          value={`$${(totalSpent._sum.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accent="emerald"
        />
        <StatCard label="This Month" value={`$${thisMonth.toFixed(2)}`} trend={change} accent="blue" />
        <StatCard
          label="Missed Rewards"
          value={`$${missedRewards.reduce((s, m) => s + m.recommendation.estimatedReward, 0).toFixed(2)}`}
          accent="amber"
        />
      </div>

      {/* Daily Spending */}
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-zinc-900 mb-4">Daily Spending</h2>
        {dailyData.length > 0 ? (
          <DailySpendChart data={dailyData} />
        ) : (
          <p className="text-zinc-400 text-sm text-center py-8">No spending data this month</p>
        )}
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">By Category</h2>
          {categoryChartData.length > 0 ? (
            <CategoryPieChart data={categoryChartData} />
          ) : (
            <p className="text-zinc-400 text-sm text-center py-8">No data yet</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Top Merchants</h2>
          {merchantChartData.length > 0 ? (
            <MerchantBarChart data={merchantChartData} />
          ) : (
            <p className="text-zinc-400 text-sm text-center py-8">No data yet</p>
          )}
        </div>

        {/* Recent receipts */}
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="font-semibold text-zinc-900">Recent</h2>
            <Link href="/receipts" className="text-xs font-medium text-violet-600 hover:text-violet-700">
              View all
            </Link>
          </div>
          {recentReceipts.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-zinc-400 text-sm">No receipts yet</p>
              <Link href="/email" className="mt-2 inline-block text-xs font-medium text-violet-600">
                Connect Gmail to start
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {recentReceipts.map((r) => (
                <Link
                  key={r.id}
                  href={`/receipts/${r.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{r.merchantCanonicalName}</p>
                    <p className="text-[11px] text-zinc-400"><LocalDate date={r.purchasedAt} /></p>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 tabular-nums">${r.total.toFixed(2)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      {categorySpend.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="font-semibold text-zinc-900 mb-4">Category Breakdown</h2>
          <div className="space-y-3">
            {categorySpend.map((cat) => {
              const amount = cat._sum.total ?? 0;
              const maxAmount = categorySpend[0]._sum.total ?? 1;
              const pct = (amount / maxAmount) * 100;
              return (
                <div key={cat.merchantCategory}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[cat.merchantCategory] ?? "bg-zinc-400"}`} />
                      <span className="text-sm font-medium text-zinc-700">{cat.merchantCategory}</span>
                      <span className="text-xs text-zinc-400">{cat._count} receipt{cat._count !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900 tabular-nums">${amount.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${CATEGORY_COLORS[cat.merchantCategory] ?? "bg-zinc-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, trend, accent }: {
  label: string;
  value: string;
  trend?: number;
  accent: string;
}) {
  const accents: Record<string, string> = {
    violet: "border-l-violet-500",
    emerald: "border-l-emerald-500",
    blue: "border-l-blue-500",
    amber: "border-l-amber-500",
  };

  return (
    <div className={`bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5 border-l-4 ${accents[accent]}`}>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
      {trend !== undefined && trend !== 0 && (
        <p className={`mt-1 text-xs font-medium ${trend > 0 ? "text-red-500" : "text-emerald-500"}`}>
          {trend > 0 ? "+" : ""}{trend.toFixed(0)}% vs last month
        </p>
      )}
    </div>
  );
}
