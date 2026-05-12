import { db } from '@receipts/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Merchant Analytics Page
 * Shows transaction volume, revenue trends, and device performance.
 */
export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Get merchant's devices via their merchant connections
  const merchantConns = await db.merchantConnection.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const merchantConnIds = merchantConns.map(c => c.id);

  const devices = await db.device.findMany({
    where: {
      merchantId: { in: merchantConnIds.length > 0 ? merchantConnIds : ['__none__'] },
    },
    select: { id: true },
  });

  const deviceIds = devices.map(d => d.id);

  // Aggregate stats for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalReceipts, totalRevenue, todayReceipts, webhookEvents] = await Promise.all([
    db.receipt.count({
      where: {
        source: 'POS',
        userId: session.user.id,
        purchasedAt: { gte: thirtyDaysAgo },
      },
    }),
    db.receipt.aggregate({
      where: {
        source: 'POS',
        userId: session.user.id,
        purchasedAt: { gte: thirtyDaysAgo },
      },
      _sum: { total: true },
    }),
    db.receipt.count({
      where: {
        source: 'POS',
        userId: session.user.id,
        purchasedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    db.webhookEvent.count({
      where: {
        deviceId: { in: deviceIds.length > 0 ? deviceIds : ['__none__'] },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  // Daily breakdown for chart
  const dailyStats = await db.$queryRawUnsafe<Array<{
    day: Date;
    count: bigint;
    revenue: number;
  }>>(
    `SELECT
      date_trunc('day', "purchasedAt") as day,
      COUNT(*) as count,
      COALESCE(SUM(total), 0) as revenue
    FROM "Receipt"
    WHERE "userId" = $1
      AND source = 'POS'
      AND "purchasedAt" >= $2
    GROUP BY date_trunc('day', "purchasedAt")
    ORDER BY day ASC`,
    session.user.id,
    thirtyDaysAgo
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Analytics</h1>
        <p className="text-neutral-600 mt-1">Last 30 days of POS activity</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Receipts Captured"
          value={totalReceipts.toLocaleString()}
          subtitle="Last 30 days"
        />
        <StatCard
          label="Total Revenue"
          value={`$${(totalRevenue._sum.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          subtitle="Last 30 days"
        />
        <StatCard
          label="Today"
          value={todayReceipts.toLocaleString()}
          subtitle="Receipts today"
        />
        <StatCard
          label="Webhook Events"
          value={webhookEvents.toLocaleString()}
          subtitle="Processed"
        />
      </div>

      {/* Daily Chart */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Daily Receipts</h2>
        <div className="h-64 flex items-end gap-1">
          {dailyStats.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-neutral-400">
              No data yet
            </div>
          ) : (
            dailyStats.map((day, i) => {
              const maxCount = Math.max(...dailyStats.map(d => Number(d.count)));
              const height = maxCount > 0 ? (Number(day.count) / maxCount) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-neutral-900 rounded-t min-h-[2px]"
                    style={{ height: `${height}%` }}
                    title={`${new Date(day.day).toLocaleDateString()}: ${day.count} receipts, $${Number(day.revenue).toFixed(2)}`}
                  />
                </div>
              );
            })
          )}
        </div>
        {dailyStats.length > 0 && (
          <div className="flex justify-between mt-2 text-xs text-neutral-400">
            <span>{new Date(dailyStats[0].day).toLocaleDateString()}</span>
            <span>{new Date(dailyStats[dailyStats.length - 1].day).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Device Performance */}
      <div className="mt-6 bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Device Health</h2>
        <p className="text-neutral-500 text-sm">
          {devices.length} device{devices.length !== 1 ? 's' : ''} registered
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-2xl font-bold text-neutral-900 mt-1">{value}</p>
      <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>
    </div>
  );
}
