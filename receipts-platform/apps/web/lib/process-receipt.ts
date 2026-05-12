import { db } from "@receipts/db";
import { parseReceiptFromImage } from "@/lib/ocr";

export async function processReceiptJob(params: {
  jobId: string;
  userId: string;
  fileUrl: string;
  fileBase64: string;
}) {
  const { jobId, userId, fileUrl, fileBase64 } = params;

  try {
    await db.ingestionJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    const parsed = await parseReceiptFromImage(fileBase64);

    const receipt = await db.receipt.create({
      data: {
        userId,
        source: "UPLOAD",
        fileUrl,
        merchantRawName: parsed.merchant.rawName,
        merchantCanonicalName: parsed.merchant.canonicalName,
        merchantCategory: parsed.merchant.category,
        merchantLocation: parsed.merchant.location,
        purchasedAt: new Date(parsed.purchase.purchasedAt),
        currency: parsed.purchase.currency,
        subtotal: parsed.purchase.subtotal,
        tax: parsed.purchase.tax,
        tip: parsed.purchase.tip,
        discount: parsed.purchase.discount,
        fees: parsed.purchase.fees,
        total: parsed.purchase.total,
        paymentMethod: parsed.payment.method,
        cardLast4: parsed.payment.cardLast4,
        walletType: parsed.payment.walletType,
        entryMode: parsed.payment.entryMode,
        confidence: parsed.metadata.confidence,
        requiresReview: parsed.metadata.requiresReview,
        items: {
          create: parsed.items.map((item) => ({
            rawName: item.rawName,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            category: item.category,
          })),
        },
      },
    });

    await db.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        receiptId: receipt.id,
      },
    });
  } catch (error) {
    await db.ingestionJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}
