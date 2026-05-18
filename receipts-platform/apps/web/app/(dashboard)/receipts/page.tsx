import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import Link from "next/link";
import { detectSubscriptions } from "@/lib/subscriptions/detect";
import { ReceiptCalendar } from "./receipt-calendar";
import { LiveReceiptsFeed } from "./live-feed";
import { ViewToggle } from "./view-toggle";

export const dynamic = 'force-dynamic';

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; view?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const params = await searchParams;
  const activeView = params.view ?? "feed";

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

  const [receipts, detectedSubscriptions] = await Promise.all([
    db.receipt.findMany({
      where,
      orderBy: { purchasedAt: "desc" },
      take: 200,
      select: {
        id: true,
        merchantCanonicalName: true,
        merchantCategory: true,
        total: true,
        purchasedAt: true,
        source: true,
        cardLast4: true,
        requiresReview: true,
      },
    }),
    detectSubscriptions(userId),
  ]);

  const totalAmount = receipts.reduce((sum, r) => sum + r.total, 0);

  const serialized = receipts.map(r => ({
    ...r,
    purchasedAt: r.purchasedAt.toISOString(),
  }));

  const serializedSubscriptions = detectedSubscriptions.map(sub => ({
    merchantName: sub.merchantName,
    amount: sub.amount,
    frequency: sub.frequency,
    confidence: sub.confidence,
    category: sub.category,
    nextExpectedAt: sub.nextExpectedAt.toISOString(),
    firstChargeAt: sub.firstChargeAt.toISOString(),
    lastChargeAt: sub.lastChargeAt.toISOString(),
  }));

  return (
    <div>
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-in { animation: slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Receipts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} &middot; ${totalAmount.toFixed(2)} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle activeView={activeView} />
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

      {receipts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm">No receipts yet</p>
          <Link href="/email" className="mt-3 inline-block text-sm font-medium text-violet-600 hover:text-violet-700">
            Go to Connections to sync
          </Link>
        </div>
      ) : activeView === "feed" ? (
        <LiveReceiptsFeed initialReceipts={serialized} />
      ) : (
        <ReceiptCalendar receipts={serialized} subscriptions={serializedSubscriptions} />
      )}
    </div>
  );
}
