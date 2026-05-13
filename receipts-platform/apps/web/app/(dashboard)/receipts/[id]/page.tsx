import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { notFound } from "next/navigation";
import { SaveReceiptButton } from "./save-button";
import { calculateReward, findBestCard, getCardCategory, CARD_DATABASE } from "@/lib/rewards/card-database";
import { LocalDate } from "@/app/components/local-date";
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

  const userCards = await db.userCard.findMany({
    where: { userId: session!.user!.id! },
  });

  const category = getCardCategory(receipt.merchantCanonicalName);

  let earnedReward: { points: number; cashValue: number; rate: number; cardName: string } | null = null;
  if (receipt.cardLast4) {
    const usedCard = userCards.find(c => c.last4 === receipt.cardLast4);
    if (usedCard) {
      const dbMatch = CARD_DATABASE.find(d => d.name.toLowerCase() === usedCard.name.toLowerCase());
      if (dbMatch) {
        const reward = calculateReward(dbMatch.id, receipt.total, receipt.merchantCanonicalName);
        earnedReward = { ...reward, cardName: usedCard.name };
      }
    }
  }

  const dbCardIds = userCards
    .map(c => CARD_DATABASE.find(d => d.name.toLowerCase() === c.name.toLowerCase())?.id)
    .filter(Boolean) as string[];

  let bestCard: { cardId: string; reward: number; rate: number; cardName: string } | null = null;
  if (dbCardIds.length > 0) {
    const best = findBestCard(dbCardIds, receipt.total, receipt.merchantCanonicalName);
    if (best) {
      const card = CARD_DATABASE.find(c => c.id === best.cardId);
      bestCard = { ...best, cardName: card?.name ?? best.cardId };
    }
  }

  const couldHaveEarnedMore = bestCard && earnedReward && bestCard.reward > earnedReward.cashValue;
  const hasOriginalReceipt = !!receipt.receiptUrl;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/receipts" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
        <SaveReceiptButton />
      </div>

      <div id="receipt-capture">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-zinc-900">{receipt.merchantCanonicalName}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm text-zinc-500"><LocalDate date={receipt.purchasedAt} format="long" /></span>
                <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">{category}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-zinc-900 tabular-nums">${receipt.total.toFixed(2)}</p>
              {receipt.cardLast4 && (
                <p className="text-xs text-zinc-400 font-mono mt-0.5">**** {receipt.cardLast4}</p>
              )}
            </div>
          </div>

          {(receipt.tax > 0 || receipt.tip > 0 || receipt.discount > 0) && (
            <div className="mt-5 pt-4 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {receipt.subtotal > 0 && receipt.subtotal !== receipt.total && (
                <Stat label="Subtotal" value={`$${receipt.subtotal.toFixed(2)}`} />
              )}
              {receipt.tax > 0 && <Stat label="Tax" value={`$${receipt.tax.toFixed(2)}`} />}
              {receipt.tip > 0 && <Stat label="Tip" value={`$${receipt.tip.toFixed(2)}`} />}
              {receipt.discount > 0 && <Stat label="Discount" value={`-$${receipt.discount.toFixed(2)}`} color="emerald" />}
            </div>
          )}
        </div>

        {/* Original merchant receipt — fetched server-side via our proxy */}
        {hasOriginalReceipt && (
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Merchant Receipt</h2>
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Original</span>
            </div>
            <iframe
              src={`/api/receipts/${receipt.id}/original`}
              className="w-full min-h-[500px] border-0"
              title="Original merchant receipt"
            />
          </div>
        )}

        {/* Items */}
        {receipt.items.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-4">
            <div className="px-6 py-3 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">{receipt.items.length} Item{receipt.items.length !== 1 ? "s" : ""}</h2>
            </div>
            <div className="divide-y divide-zinc-50">
              {receipt.items.map((item) => (
                <div key={item.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-900">{item.name}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-zinc-400">Qty: {item.quantity} x ${item.unitPrice.toFixed(2)}</p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-zinc-900 tabular-nums">${item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reward insight */}
      {(earnedReward || bestCard) && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">Reward Insight</h3>
          </div>
          <div className="p-5">
            {earnedReward && (
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-zinc-500">Earned with {earnedReward.cardName}</p>
                  <p className="text-lg font-bold text-emerald-600">
                    ${earnedReward.cashValue.toFixed(2)}
                    <span className="text-xs font-normal text-zinc-400 ml-1">({earnedReward.rate}%)</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            )}
            {couldHaveEarnedMore && bestCard && (
              <div className="rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3">
                <p className="text-xs font-medium text-amber-800">
                  Could have earned ${bestCard.reward.toFixed(2)} with {bestCard.cardName}
                </p>
                <p className="text-[11px] text-amber-600">
                  ${(bestCard.reward - (earnedReward?.cashValue ?? 0)).toFixed(2)} more ({bestCard.rate}% vs {earnedReward?.rate ?? 0}%)
                </p>
              </div>
            )}
            {!earnedReward && bestCard && (
              <div>
                <p className="text-xs text-zinc-500">Best card for this purchase</p>
                <p className="text-sm font-semibold text-zinc-900">{bestCard.cardName}</p>
                <p className="text-lg font-bold text-emerald-600">
                  ${bestCard.reward.toFixed(2)} back <span className="text-xs font-normal text-zinc-400">({bestCard.rate}%)</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {userCards.length === 0 && (
        <div className="rounded-2xl bg-violet-50 border border-violet-200/60 px-5 py-4 text-center mb-4">
          <p className="text-sm font-medium text-violet-900">Add your cards to see reward insights</p>
          <Link href="/cards" className="mt-2 inline-block text-xs font-semibold text-violet-700">Go to Cards &rarr;</Link>
        </div>
      )}

      {receipt.requiresReview && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/80 px-5 py-4 flex items-start gap-3">
          <svg className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Review recommended</p>
            <p className="mt-0.5 text-sm text-amber-700">Low confidence ({(receipt.confidence * 100).toFixed(0)}%)</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${color === "emerald" ? "text-emerald-600" : "text-zinc-900"}`}>{value}</p>
    </div>
  );
}
