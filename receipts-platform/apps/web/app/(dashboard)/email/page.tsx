import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { redirect } from "next/navigation";
import { LocalDate } from "@/app/components/local-date";
import { DisconnectButton } from "../settings/disconnect-button";
import { SyncButton } from "../settings/sync-button";

export const dynamic = 'force-dynamic';

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; connected?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const [emailConnections, merchantConnections, customerConnections] =
    await Promise.all([
      db.emailConnection.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
      db.merchantConnection.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
      db.customerConnection.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const totalConnections = emailConnections.length + merchantConnections.length + customerConnections.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Connections</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {totalConnections} source{totalConnections !== 1 ? "s" : ""} connected
        </p>
      </div>

      {/* Banners */}
      {params.connected && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          {params.connected === "email_connected" || params.success === "email_connected"
            ? "Gmail connected! Your receipts are being imported."
            : `${params.connected.charAt(0).toUpperCase() + params.connected.slice(1)} connected successfully!`}
        </div>
      )}
      {params.success === "email_connected" && !params.connected && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          Gmail connected! Your receipts are being imported.
        </div>
      )}
      {params.error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-medium text-red-800">Connection failed</p>
          <p className="text-xs text-red-600 mt-1">{decodeURIComponent(params.error)}</p>
        </div>
      )}

      {/* Email Connections */}
      <section className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900">Email</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Auto-import receipts from Gmail</p>
          </div>
          {emailConnections.length === 0 ? (
            <a
              href="/api/email/connect"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              <GmailIcon />
              Connect Gmail
            </a>
          ) : (
            <a
              href="/api/email/connect"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              + Add another
            </a>
          )}
        </div>

        {emailConnections.length > 0 && (
          <div className="divide-y divide-zinc-50">
            {emailConnections.map((conn) => (
              <div key={conn.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                    <GmailIcon />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{conn.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        conn.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                      }`}>
                        {conn.isActive ? "Active" : "Inactive"}
                      </span>
                      {conn.lastSyncAt && (
                        <span className="text-[11px] text-zinc-400">
                          Synced <LocalDate date={conn.lastSyncAt} format="datetime" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SyncButton />
                  <DisconnectButton id={conn.id} type="email" />
                </div>
              </div>
            ))}
          </div>
        )}

        {emailConnections.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-zinc-400">No email accounts connected yet</p>
            <p className="text-xs text-zinc-400 mt-1">Connect Gmail to import receipts from Amazon, Walmart, Uber, and more</p>
          </div>
        )}
      </section>

      {/* POS / Merchant Connections */}
      <section className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Merchants</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Connect POS systems for direct transaction import</p>
        </div>

        {merchantConnections.length > 0 && (
          <div className="divide-y divide-zinc-50">
            {merchantConnections.map((conn) => (
              <div key={conn.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                    <span className="text-sm font-bold text-violet-600">{conn.provider.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 capitalize">{conn.provider}</p>
                    <p className="text-xs text-zinc-400">{conn.merchantName ?? conn.merchantId}</p>
                  </div>
                </div>
                <DisconnectButton id={conn.id} type="merchant" />
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-zinc-50 flex flex-wrap gap-2">
          {!merchantConnections.some(c => c.provider === "square") ? (
            <ConnectorButton href="/api/connectors/square/connect" label="Square" />
          ) : (
            <ConnectorButton href="/api/connectors/square/connect" label="+ Another Square" />
          )}
          {!merchantConnections.some(c => c.provider === "shopify") ? (
            <ConnectorButton href="/api/connectors/shopify/connect" label="Shopify" />
          ) : (
            <ConnectorButton href="/api/connectors/shopify/connect" label="+ Another Shopify" />
          )}
          {!merchantConnections.some(c => c.provider === "clover") ? (
            <ConnectorButton href="/api/connectors/clover/connect" label="Clover" />
          ) : (
            <ConnectorButton href="/api/connectors/clover/connect" label="+ Another Clover" />
          )}
        </div>
      </section>

      {/* Customer Connections */}
      <section className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Accounts</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Import purchase history from consumer accounts</p>
        </div>

        {customerConnections.length > 0 && (
          <div className="divide-y divide-zinc-50">
            {customerConnections.map((conn) => (
              <div key={conn.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">{conn.provider.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 capitalize">{conn.provider}</p>
                    <p className="text-xs text-zinc-400">{conn.email ?? conn.accountId}</p>
                  </div>
                </div>
                <DisconnectButton id={conn.id} type="customer" />
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-zinc-50 flex flex-wrap gap-2">
          <ConnectorButton href="/api/connectors/customer/paypal/connect" label="PayPal" />
          <ConnectorButton href="/api/connectors/customer/shopify-customer/connect" label="Shopify" />
        </div>
      </section>

      {/* Retailer Accounts */}
      <section className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900">Retailers</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Connect your retail accounts to import full order history with items</p>
        </div>

        <div className="px-6 py-4 space-y-3">
          <RetailerRow retailer="costco" label="Costco" icon="🏪" description="Warehouse receipts with item details" />
          <RetailerRow retailer="amazon" label="Amazon" icon="📦" description="Order history and invoices" comingSoon />
          <RetailerRow retailer="walmart" label="Walmart" icon="🛒" description="Purchase history" comingSoon />
          <RetailerRow retailer="target" label="Target" icon="🎯" description="Circle account orders" comingSoon />
        </div>
      </section>
    </div>
  );
}

function ConnectorButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
    >
      + {label}
    </a>
  );
}

function RetailerRow({ retailer, label, icon, description, comingSoon }: {
  retailer: string; label: string; icon: string; description: string; comingSoon?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-xl">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900">{label}</p>
          <p className="text-[10px] text-zinc-400">{description}</p>
        </div>
      </div>
      {comingSoon ? (
        <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded-full px-2.5 py-1">
          Coming Soon
        </span>
      ) : (
        <a
          href={`/connect/${retailer}`}
          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Connect
        </a>
      )}
    </div>
  );
}

function GmailIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
      <path d="M22 6L12 13 2 6V4l10 7 10-7v2z" fill="#EA4335"/>
      <path d="M2 6v12h4V8l6 4.5L18 8v10h4V6L12 13 2 6z" fill="#4285F4"/>
    </svg>
  );
}
