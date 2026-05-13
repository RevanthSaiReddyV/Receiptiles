import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import Link from "next/link";
import { LocalDate } from "@/app/components/local-date";

export const dynamic = 'force-dynamic';

const CATEGORY_COLORS: Record<string, string> = {
  Shopping: "bg-violet-100 text-violet-700",
  Dining: "bg-amber-100 text-amber-700",
  Groceries: "bg-emerald-100 text-emerald-700",
  Transportation: "bg-blue-100 text-blue-700",
  Subscriptions: "bg-fuchsia-100 text-fuchsia-700",
  Electronics: "bg-cyan-100 text-cyan-700",
  Entertainment: "bg-pink-100 text-pink-700",
  Uncategorized: "bg-zinc-100 text-zinc-600",
};

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

  const totalAmount = receipts.reduce((sum, r) => sum + r.total, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Receipts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} &middot; ${totalAmount.toFixed(2)} total
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Upload
        </Link>
      </div>

      {/* Search */}
      <form className="mb-6">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            name="q"
            type="search"
            placeholder="Search merchants..."
            defaultValue={params.q ?? ""}
            className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100 shadow-sm"
          />
        </div>
      </form>

      {/* Receipt list */}
      {receipts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm">No receipts found</p>
          <Link href="/settings" className="mt-3 inline-block text-sm font-medium text-violet-600 hover:text-violet-700">
            Connect Gmail to import receipts
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden divide-y divide-zinc-100">
          {receipts.map((r) => (
            <Link
              key={r.id}
              href={`/receipts/${r.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-zinc-600">
                    {r.merchantCanonicalName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{r.merchantCanonicalName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-400">
                      <LocalDate date={r.purchasedAt} />
                    </span>
                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[r.merchantCategory] ?? CATEGORY_COLORS.Uncategorized}`}>
                      {r.merchantCategory}
                    </span>
                    {r.requiresReview && (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                        Review
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                  ${r.total.toFixed(2)}
                </span>
                <p className="text-[10px] text-zinc-400 uppercase mt-0.5">{r.source}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
