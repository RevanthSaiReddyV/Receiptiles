import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { notFound } from "next/navigation";
import { ReceiptPaper } from "./receipt-paper";
import { SaveReceiptButton } from "./save-button";
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
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/receipts"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
        <SaveReceiptButton />
      </div>

      {/* Receipt */}
      <div id="receipt-capture" className="drop-shadow-xl">
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

      {/* Summary */}
      <div className="mt-6 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Details</h3>
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            {receipt.source === "POS" ? "POS" : receipt.source === "EMAIL" ? "Email" : receipt.source}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-zinc-500">Merchant</span>
          <span className="text-zinc-900 font-medium text-right">{receipt.merchantCanonicalName}</span>
          <span className="text-zinc-500">Category</span>
          <span className="text-zinc-900 text-right">{receipt.merchantCategory}</span>
          {receipt.cardLast4 && (
            <>
              <span className="text-zinc-500">Card</span>
              <span className="text-zinc-900 text-right font-mono text-xs">**** {receipt.cardLast4}</span>
            </>
          )}
          {receipt.items.length > 0 && (
            <>
              <span className="text-zinc-500">Items</span>
              <span className="text-zinc-900 text-right">{receipt.items.length}</span>
            </>
          )}
        </div>
      </div>

      {receipt.requiresReview && (
        <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200/80 px-5 py-4 flex items-start gap-3">
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
