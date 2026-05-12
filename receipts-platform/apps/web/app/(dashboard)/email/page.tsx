import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

export default async function EmailPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const connections = await db.emailConnection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold">Email Connections</h1>
      <p className="mt-1 text-gray-600">
        Connect your email to automatically import receipts from online
        purchases.
      </p>

      <div className="mt-6">
        <a
          href="/api/email/connect"
          className="inline-block rounded-lg bg-black px-6 py-3 text-white font-medium hover:bg-gray-800"
        >
          Connect Gmail
        </a>
      </div>

      {connections.length > 0 && (
        <div className="mt-8 space-y-2">
          <h2 className="text-lg font-semibold">Connected Accounts</h2>
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{conn.email}</p>
                <p className="text-sm text-gray-500">
                  Last synced:{" "}
                  {conn.lastSyncAt
                    ? new Date(conn.lastSyncAt).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  conn.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {conn.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
