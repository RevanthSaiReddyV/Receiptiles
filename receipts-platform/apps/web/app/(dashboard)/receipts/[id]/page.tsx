import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { notFound } from "next/navigation";
import { ReceiptPaper } from "./receipt-paper";
import { SaveReceiptButton } from "./save-button";
import { calculateReward, findBestCard, getCardCategory, CARD_DATABASE } from "@/lib/rewards/card-database";
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

  // Get user's cards for reward calculation
  const userCards = await db.userCard.findMany({
    where: { userId: session!.user!.id! },
    include: { rewardRules: true },
  });

  // Calculate rewards
  const category = getCardCategory(receipt.merchantCanonicalName);
  const userCardIds = userCards.map(c => {
    const match = CARD_DATABASE.find(
      db => db.name.toLowerCase() === c.name.toLowerCase() ||
        db.id === c.name.toLowerCase().replace(/\s+/g, "-")
    );
    return { dbCardId: match?.id, userCard: c };
  }).filter(c => c.dbCardId);

  // What user earned (if card is matched)
  let earnedReward: { points: number; cashValue: number; rate: number; cardName: string } | null = null;
  if (receipt.cardLast4) {
    const usedCard = userCards.find(c => c.last4 === receipt.cardLast4);
    if (usedCard) {
      const dbMatch = CARD_DATABASE.find(
        db => db.name.toLowerCase() === usedCard.name.toLowerCase()
      );
      if (dbMatch) {
        const reward = calculateReward(dbMatch.id, receipt.total, receipt.merchantCanonicalName);
        earnedReward = { ...reward, cardName: usedCard.name };
      }
    }
  }

  // Best card recommendation
  let bestCard: { cardId: string; reward: number; rate: number; cardName: string } | null = null;
  const dbCardIds = userCardIds.map(c => c.dbCardId!);
  if (dbCardIds.length > 0) {
    const best = findBestCard(dbCardIds, receipt.total, receipt.merchantCanonicalName);
    if (best) {
      const card = CARD_DATABASE.find(c => c.id === best.cardId);
      bestCard = { ...best, cardName: card?.name ?? best.cardId };
    }
  }

  const couldHaveEarnedMore = bestCard && earnedReward && bestCard.reward > earnedReward.cashValue;

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

      {/* Reward insight card */}
      {(earnedReward || bestCard) && (
        <div className="mb-6 bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">Reward Insight</h3>
          </div>
          <div className="p-5">
            {/* Category badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                {category}
              </span>
              <span className="text-[11px] text-zinc-400">reward category</span>
            </div>

            {/* What you earned */}
            {earnedReward && (
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-zinc-500">You earned with {earnedReward.cardName}</p>
                  <p className="text-lg font-bold text-emerald-600">
                    ${earnedReward.cashValue.toFixed(2)}
                    <span className="text-xs font-normal text-zinc-400 ml-1">
                      ({earnedReward.rate}% back)
                    </span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Better option */}
            {couldHaveEarnedMore && bestCard && (
              <div className="rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-amber-800">
                      Could have earned ${bestCard.reward.toFixed(2)} with {bestCard.cardName}
                    </p>
                    <p className="text-[11px] text-amber-600">
                      That&apos;s ${(bestCard.reward - (earnedReward?.cashValue ?? 0)).toFixed(2)} more ({bestCard.rate}% vs {earnedReward?.rate ?? 0}%)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Best card when no card was tracked */}
            {!earnedReward && bestCard && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500">Best card for this purchase</p>
                  <p className="text-sm font-semibold text-zinc-900">{bestCard.cardName}</p>
                  <p className="text-lg font-bold text-emerald-600">
                    ${bestCard.reward.toFixed(2)} back
                    <span className="text-xs font-normal text-zinc-400 ml-1">({bestCard.rate}%)</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
          <span className="text-zinc-900 text-right">{category}</span>
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

      {/* No cards prompt */}
      {userCards.length === 0 && (
        <div className="mt-4 rounded-2xl bg-violet-50 border border-violet-200/60 px-5 py-4 text-center">
          <p className="text-sm font-medium text-violet-900">Add your cards to see reward insights</p>
          <p className="text-xs text-violet-600 mt-1">We&apos;ll show you how much you earn and the best card for each purchase</p>
          <Link href="/cards" className="mt-3 inline-block text-xs font-semibold text-violet-700 hover:text-violet-900">
            Go to Cards &rarr;
          </Link>
        </div>
      )}

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
