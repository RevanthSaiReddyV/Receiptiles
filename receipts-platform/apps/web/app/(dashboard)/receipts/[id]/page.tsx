import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { notFound } from "next/navigation";
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

  const hasOriginal = !!receipt.receiptUrl;

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

      {/* Original receipt from POS — open in new tab */}
      {hasOriginal && (
        <div className="mb-6 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-zinc-900">Original merchant receipt available</h2>
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            View the receipt exactly as the merchant printed it — with their branding, logo, and full details.
          </p>
          <a
            href={receipt.receiptUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            View Original Receipt
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
      )}

      {/* Our rendered receipt — only show if no original */}
      {!hasOriginal && (
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
      )}

      {/* Quick summary card — always show */}
      <div className="mt-6 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-900">Summary</h3>
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
            {receipt.source === "POS" ? "POS Capture" : receipt.source === "EMAIL" ? "Email Import" : receipt.source}
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
              <span className="text-zinc-900 text-right">**** {receipt.cardLast4}</span>
            </>
          )}
          <span className="text-zinc-500">Subtotal</span>
          <span className="text-zinc-900 text-right tabular-nums">${receipt.subtotal.toFixed(2)}</span>
          {receipt.tax > 0 && (
            <>
              <span className="text-zinc-500">Tax</span>
              <span className="text-zinc-900 text-right tabular-nums">${receipt.tax.toFixed(2)}</span>
            </>
          )}
          {receipt.tip > 0 && (
            <>
              <span className="text-zinc-500">Tip</span>
              <span className="text-zinc-900 text-right tabular-nums">${receipt.tip.toFixed(2)}</span>
            </>
          )}
          <span className="text-zinc-900 font-semibold pt-2 border-t border-zinc-100">Total</span>
          <span className="text-zinc-900 font-bold text-right tabular-nums pt-2 border-t border-zinc-100">${receipt.total.toFixed(2)}</span>
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
