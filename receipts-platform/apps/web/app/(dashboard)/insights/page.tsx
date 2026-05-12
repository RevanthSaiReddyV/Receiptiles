import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { getMissedRewards } from "@/lib/card-optimizer";
import { CategoryPieChart, MerchantBarChart, DailySpendChart } from "./charts";

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [categorySpend, topMerchants, monthlyTotal, lastMonthTotal, missedRewards, dailyReceipts] =
    await Promise.all([
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
        where: {
          userId,
          purchasedAt: { gte: startOfLastMonth, lt: startOfMonth },
        },
        _sum: { total: true },
      }),
      getMissedRewards(userId),
      db.receipt.findMany({
        where: { userId, purchasedAt: { gte: startOfMonth } },
        select: { purchasedAt: true, total: true },
        orderBy: { purchasedAt: "asc" },
      }),
    ]);

  const thisMonth = monthlyTotal._sum.total ?? 0;
  const lastMonth = lastMonthTotal._sum.total ?? 0;
  const change = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  // Aggregate daily spend for line chart
  const dailyMap = new Map<string, number>();
  for (const r of dailyReceipts) {
    const day = new Date(r.purchasedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + r.total);
  }
  const dailyData = Array.from(dailyMap, ([date, total]) => ({ date, total }));

  // Chart data transforms
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

  return (
    <div>
      <h1 className="text-2xl font-bold">Spending Insights</h1>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="mt-1 text-2xl font-bold">${thisMonth.toFixed(2)}</p>
          {change !== 0 && (
            <p className={`text-sm ${change > 0 ? "text-red-600" : "text-green-600"}`}>
              {change > 0 ? "+" : ""}{change.toFixed(1)}% vs last month
            </p>
          )}
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Categories</p>
          <p className="mt-1 text-2xl font-bold">{categorySpend.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Missed Rewards</p>
          <p className="mt-1 text-2xl font-bold">
            ${missedRewards.reduce((s, m) => s + m.recommendation.estimatedReward, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Daily Spending Line Chart */}
      <div className="mt-8 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold mb-4">Daily Spending</h2>
        <DailySpendChart data={dailyData} />
        {dailyData.length === 0 && (
          <p className="text-gray-500 text-center py-8">No spending data this month.</p>
        )}
      </div>

      {/* Charts Row */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
          <CategoryPieChart data={categoryChartData} />
          {categoryChartData.length === 0 && (
            <p className="text-gray-500 text-center">No data yet.</p>
          )}
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold mb-4">Top Merchants</h2>
          <MerchantBarChart data={merchantChartData} />
          {merchantChartData.length === 0 && (
            <p className="text-gray-500 text-center">No data yet.</p>
          )}
        </div>
      </div>

      {/* Category Breakdown List */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Category Breakdown</h2>
          <div className="mt-4 space-y-2">
            {categorySpend.map((cat) => (
              <div key={cat.merchantCategory} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{cat.merchantCategory}</p>
                  <p className="text-sm text-gray-500">{cat._count} receipt{cat._count !== 1 ? "s" : ""}</p>
                </div>
                <p className="font-semibold">${(cat._sum.total ?? 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">All Top Merchants</h2>
          <div className="mt-4 space-y-2">
            {topMerchants.map((m) => (
              <div key={m.merchantCanonicalName} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{m.merchantCanonicalName}</p>
                  <p className="text-sm text-gray-500">{m._count} visit{m._count !== 1 ? "s" : ""}</p>
                </div>
                <p className="font-semibold">${(m._sum.total ?? 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Missed Rewards */}
      {missedRewards.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Missed Reward Opportunities</h2>
          <div className="mt-4 space-y-2">
            {missedRewards.slice(0, 10).map((m) => (
              <div key={m.receiptId} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{m.merchant}</p>
                  <p className="text-sm text-gray-500">{m.recommendation.reason}</p>
                </div>
                <p className="font-semibold text-green-600">+${m.recommendation.estimatedReward.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
