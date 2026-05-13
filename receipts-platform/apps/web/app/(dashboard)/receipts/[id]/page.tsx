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
      <div className="mb-4">
        <Link href="/receipts" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back to receipts
        </Link>
      </div>

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

      {receipt.requiresReview && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 text-center">
          Low confidence ({(receipt.confidence * 100).toFixed(0)}%) — may need review
        </div>
      )}
    </div>
  );
}
