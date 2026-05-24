import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { redirect } from "next/navigation";
import { RETAILER_CATALOG } from "@/lib/connectors/retailers";
import { ConnectionsGrid } from "./connections-grid";
import { PlaidLinkButton } from "./plaid-link";

export default async function ConnectionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Fetch user's retailer connections
  const connections = await db.retailerConnection.findMany({
    where: { userId },
    select: {
      id: true,
      retailer: true,
      isActive: true,
      lastSyncAt: true,
      createdAt: true,
    },
  });

  // Get receipt counts per source
  const receiptCounts = await db.receipt.groupBy({
    by: ["source"],
    where: { userId, source: { in: ["PROCESSOR", "EMAIL", "POS", "UPLOAD"] } },
    _count: { id: true },
  });

  const countMap: Record<string, number> = {};
  for (const rc of receiptCounts) {
    const retailerId = rc.source.replace("retailer:", "");
    countMap[retailerId] = rc._count.id;
  }

  // Also get email, POS, and bank connections
  const [emailConns, merchantConns, customerConns] = await Promise.all([
    db.emailConnection.findMany({ where: { userId, isActive: true } }),
    db.merchantConnection.findMany({ where: { userId, isActive: true } }),
    db.customerConnection.findMany({ where: { userId, isActive: true } }),
  ]);

  const catalog = RETAILER_CATALOG.map((retailer) => {
    const conn = connections.find((c) => c.retailer === retailer.id);
    return {
      ...retailer,
      connected: conn?.isActive ?? false,
      connectionId: conn?.id ?? null,
      lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
      receiptCount: countMap[retailer.id] ?? 0,
    };
  });

  const totalConnected = connections.filter((c) => c.isActive).length + emailConns.length + merchantConns.length;
  const totalReceipts = Object.values(countMap).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-neutral-900">Connections</h1>
        <p className="text-neutral-500 mt-1">
          Connect your retailer accounts to automatically import all your receipts.
          The more you connect, the more complete your spending picture.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-5 text-center">
          <div className="text-3xl font-extrabold text-neutral-900">{totalConnected}</div>
          <div className="text-xs text-neutral-500 mt-1">Connected</div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5 text-center">
          <div className="text-3xl font-extrabold text-neutral-900">{totalReceipts.toLocaleString()}</div>
          <div className="text-xs text-neutral-500 mt-1">Receipts Imported</div>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-5 text-center">
          <div className="text-3xl font-extrabold text-neutral-900">{RETAILER_CATALOG.length}</div>
          <div className="text-xs text-neutral-500 mt-1">Retailers Available</div>
        </div>
      </div>

      {/* Bank Connection (Plaid) */}
      <PlaidLinkButton hasConnection={customerConns.some(c => c.provider === "plaid")} />

      {/* Other connections */}
      {(emailConns.length > 0 || merchantConns.length > 0) && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="font-bold text-sm text-neutral-700 mb-3">Other Sources</h3>
          <div className="flex flex-wrap gap-3">
            {emailConns.map((ec) => (
              <div key={ec.id} className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <span>📧</span> {ec.email}
              </div>
            ))}
            {merchantConns.map((mc) => (
              <div key={mc.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <span>🖨️</span> {mc.merchantName ?? mc.provider}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retailer Grid - Client Component */}
      <ConnectionsGrid catalog={catalog} />
    </div>
  );
}
