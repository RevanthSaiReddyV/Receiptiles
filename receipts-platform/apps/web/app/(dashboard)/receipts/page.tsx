import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import Link from "next/link";
import { LocalDate } from "@/app/components/local-date";

export const dynamic = 'force-dynamic';

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const params = await searchParams;

  const where: Record<string, unknown> = { userId };
  if (params.q) {
    where.OR = [
      { merchantCanonicalName: { contains: params.q, mode: "insensitive" } },
      { merchantRawName: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.category) {
    where.merchantCategory = params.category;
  }

  const receipts = await db.receipt.findMany({
    where,
    orderBy: { purchasedAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Receipts</h1>
        <Link
          href="/upload"
          className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Upload Receipt
        </Link>
      </div>

      <form className="mt-4 flex gap-2">
        <input
          name="q"
          type="search"
          placeholder="Search merchants..."
          defaultValue={params.q ?? ""}
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
        >
          Search
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {receipts.length === 0 ? (
          <p className="text-gray-500">No receipts found.</p>
        ) : (
          receipts.map((r) => (
            <Link
              key={r.id}
              href={`/receipts/${r.id}`}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium">{r.merchantCanonicalName}</p>
                <p className="text-sm text-gray-500">
                  <LocalDate date={r.purchasedAt} /> &middot;{" "}
                  {r.merchantCategory}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${r.total.toFixed(2)}</p>
                {r.requiresReview && (
                  <p className="text-xs text-amber-600">Needs review</p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
