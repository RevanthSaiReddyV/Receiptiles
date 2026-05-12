import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [receiptCount, totalSpent, recentReceipts] = await Promise.all([
    db.receipt.count({ where: { userId } }),
    db.receipt.aggregate({ where: { userId }, _sum: { total: true } }),
    db.receipt.findMany({
      where: { userId },
      orderBy: { purchasedAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-gray-600">
        Welcome back, {session!.user!.name || "there"}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Receipts" value={receiptCount.toString()} />
        <StatCard
          label="Total Spent"
          value={`$${(totalSpent._sum.total ?? 0).toFixed(2)}`}
        />
        <StatCard
          label="This Month"
          value={`$${await getMonthlyTotal(userId)}`}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Recent Receipts</h2>
        {recentReceipts.length === 0 ? (
          <p className="mt-4 text-gray-500">
            No receipts yet. Upload your first receipt to get started.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {recentReceipts.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{r.merchantCanonicalName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(r.purchasedAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-semibold">${r.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

async function getMonthlyTotal(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const result = await db.receipt.aggregate({
    where: { userId, purchasedAt: { gte: startOfMonth } },
    _sum: { total: true },
  });
  return (result._sum.total ?? 0).toFixed(2);
}
