import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { notFound } from "next/navigation";
import { LocalDate } from "@/app/components/local-date";
import { ReceiptPaper } from "./receipt-paper";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const receipt = await db.receipt.findFirst({
    where: { id, userId: session!.user!.id! },
    include: { items: true },
  });

  if (!receipt) notFound();

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link
          href="/receipts"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to receipts
        </Link>
      </div>

      {/* Show original POS receipt if available */}
      {receipt.receiptUrl && (
        <div className="mb-6">
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Original Receipt</h2>
                <p className="text-[11px] text-zinc-400">From merchant POS system</p>
              </div>
              <a
                href={receipt.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
              >
                Open original
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
            <iframe
              src={receipt.receiptUrl}
              className="w-full h-[600px] border-0"
              title="Original receipt"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Our rendered receipt */}
      <div className="drop-shadow-xl">
        <ReceiptPaper
          merchant={receipt.merchantCanonicalName}
          merchantRaw={receipt.merchantRawName}
          category={receipt.merchantCategory}
          location={receipt.merchantLocation}
          date={receipt.purchasedAt.toISOString()}
          items={receipt.items.map(i => ({
            name: i.name,
            qty: i.quantity,
            price: i.totalPrice,
          }))}
          subtotal={receipt.subtotal}
          tax={receipt.tax}
          tip={receipt.tip}
          discount={receipt.discount}
          fees={receipt.fees}
          total={receipt.total}
          paymentMethod={receipt.paymentMethod}
          cardLast4={receipt.cardLast4}
          source={receipt.source}
          confidence={receipt.confidence}
          receiptId={receipt.id}
        />
      </div>

      {receipt.requiresReview && (
        <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200/80 px-5 py-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Review recommended</p>
            <p className="mt-0.5 text-sm text-amber-700">
              Low confidence ({(receipt.confidence * 100).toFixed(0)}%) — some details may need correction.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
