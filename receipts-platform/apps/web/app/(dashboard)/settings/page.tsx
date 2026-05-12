import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { redirect } from "next/navigation";
import { DisconnectButton } from "./disconnect-button";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
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

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {params.success === "email_connected" && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Gmail connected successfully! Your receipts are being imported.
        </div>
      )}
      {params.error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          Connection failed: {params.error.replace(/_/g, " ")}
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Email Connections</h2>
        <p className="text-sm text-gray-600 mb-4">
          Connect your Gmail to automatically import receipt emails from Amazon,
          Walmart, Target, Instacart, DoorDash, Uber, and more.
        </p>

        {emailConnections.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {emailConnections.map((conn) => (
              <li
                key={conn.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <span className="font-medium">{conn.email}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {conn.isActive ? "Active" : "Inactive"}
                  </span>
                  {conn.lastSyncAt && (
                    <span className="ml-2 text-xs text-gray-400">
                      Last synced:{" "}
                      {new Date(conn.lastSyncAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <DisconnectButton id={conn.id} type="email" />
              </li>
            ))}
          </ul>
        ) : null}

        <a
          href="/api/email/connect"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Connect Gmail
        </a>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">POS Connections</h2>
        <p className="text-sm text-gray-600 mb-4">
          Connect merchant POS systems to import transaction history.
        </p>

        {merchantConnections.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {merchantConnections.map((conn) => (
              <li
                key={conn.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <span className="font-medium capitalize">
                    {conn.provider}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {conn.merchantName ?? conn.merchantId}
                  </span>
                </div>
                <DisconnectButton id={conn.id} type="merchant" />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex gap-2">
          <a
            href="/api/connectors/square/connect"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Connect Square
          </a>
          <a
            href="/api/connectors/shopify/connect"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Connect Shopify
          </a>
          <a
            href="/api/connectors/clover/connect"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Connect Clover
          </a>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Account Connections</h2>
        <p className="text-sm text-gray-600 mb-4">
          Connect consumer accounts to import your purchase history directly.
        </p>

        {customerConnections.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {customerConnections.map((conn) => (
              <li
                key={conn.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <span className="font-medium capitalize">
                    {conn.provider}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {conn.accountEmail ?? conn.accountId}
                  </span>
                </div>
                <DisconnectButton id={conn.id} type="customer" />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex gap-2">
          <a
            href="/api/connectors/customer/paypal/connect"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Connect PayPal
          </a>
          <a
            href="/api/connectors/customer/shopify-customer/connect"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Connect Shopify
          </a>
        </div>
      </section>
    </div>
  );
}
