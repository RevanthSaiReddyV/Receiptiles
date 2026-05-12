import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { notFound } from "next/navigation";

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
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">{receipt.merchantCanonicalName}</h1>
      <p className="text-gray-500">
        {new Date(receipt.purchasedAt).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>

      {receipt.requiresReview && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          This receipt has low confidence ({(receipt.confidence * 100).toFixed(0)}
          %) and may need manual review.
        </div>
      )}

      <div className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="font-semibold">Summary</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <dt className="text-gray-500">Merchant</dt>
          <dd>{receipt.merchantCanonicalName}</dd>
          <dt className="text-gray-500">Raw Name</dt>
          <dd className="font-mono text-xs">{receipt.merchantRawName}</dd>
          <dt className="text-gray-500">Category</dt>
          <dd>{receipt.merchantCategory}</dd>
          <dt className="text-gray-500">Source</dt>
          <dd className="capitalize">{receipt.source.toLowerCase()}</dd>
          <dt className="text-gray-500">Payment</dt>
          <dd>
            {receipt.cardLast4
              ? `**** ${receipt.cardLast4}`
              : receipt.paymentMethod}
          </dd>
        </dl>
      </div>

      <div className="mt-4 rounded-lg border bg-white p-6">
        <h2 className="font-semibold">Items</h2>
        {receipt.items.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No items parsed.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">Item</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">
                    <p>{item.name}</p>
                    {item.rawName !== item.name && (
                      <p className="text-xs text-gray-400 font-mono">
                        {item.rawName}
                      </p>
                    )}
                  </td>
                  <td className="py-2">{item.quantity}</td>
                  <td className="py-2 text-right">
                    ${item.totalPrice.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 rounded-lg border bg-white p-6">
        <h2 className="font-semibold">Totals</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Subtotal</dt>
            <dd>${receipt.subtotal.toFixed(2)}</dd>
          </div>
          {receipt.tax > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Tax</dt>
              <dd>${receipt.tax.toFixed(2)}</dd>
            </div>
          )}
          {receipt.tip > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Tip</dt>
              <dd>${receipt.tip.toFixed(2)}</dd>
            </div>
          )}
          {receipt.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Discount</dt>
              <dd>-${receipt.discount.toFixed(2)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <dt>Total</dt>
            <dd>${receipt.total.toFixed(2)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
