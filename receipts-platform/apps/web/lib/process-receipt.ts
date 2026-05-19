import { db } from "@receipts/db";
import { parseReceiptFromImage } from "@/lib/ocr";
import { sendReceiptEmail } from "@/lib/email/send";
import { syncReceiptToWalletOrder } from "@/lib/wallet/order-sync";

/**
 * Warranty duration rules by merchant category.
 * - Electronics: 1 year manufacturer warranty
 * - Appliances: 2 years manufacturer warranty
 * - Clothing/Fashion/Shopping: 30 day return window
 * - Default: 30 day return window
 */
const WARRANTY_DURATIONS: Record<string, { warrantyDays: number; returnDays: number }> = {
  Electronics: { warrantyDays: 365, returnDays: 30 },
  Appliances: { warrantyDays: 730, returnDays: 30 },
  Clothing: { warrantyDays: 0, returnDays: 30 },
  Fashion: { warrantyDays: 0, returnDays: 30 },
  Shopping: { warrantyDays: 0, returnDays: 30 },
};

function calculateWarrantyDates(
  category: string,
  purchaseDate: Date
): { warrantyExpiresAt: Date | null; returnExpiresAt: Date | null } {
  const rules = WARRANTY_DURATIONS[category] ?? { warrantyDays: 0, returnDays: 30 };

  const warrantyExpiresAt =
    rules.warrantyDays > 0
      ? new Date(purchaseDate.getTime() + rules.warrantyDays * 24 * 60 * 60 * 1000)
      : null;

  const returnExpiresAt =
    rules.returnDays > 0
      ? new Date(purchaseDate.getTime() + rules.returnDays * 24 * 60 * 60 * 1000)
      : null;

  return { warrantyExpiresAt, returnExpiresAt };
}

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

    // Calculate warranty/return window dates based on merchant category
    const purchaseDate = new Date(parsed.purchase.purchasedAt);
    const warrantyDates = calculateWarrantyDates(
      parsed.merchant.category,
      purchaseDate
    );

    const receipt = await db.receipt.create({
      data: {
        userId,
        source: "UPLOAD",
        fileUrl,
        merchantRawName: parsed.merchant.rawName,
        merchantCanonicalName: parsed.merchant.canonicalName,
        merchantCategory: parsed.merchant.category,
        merchantLocation: parsed.merchant.location,
        purchasedAt: purchaseDate,
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
        warrantyExpiresAt: warrantyDates.warrantyExpiresAt,
        returnExpiresAt: warrantyDates.returnExpiresAt,
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

    // Sync to Apple Wallet Order (non-blocking)
    syncReceiptToWalletOrder(receipt.id, userId).catch(() => {});

    if (process.env.RESEND_API_KEY) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (user?.email) {
        sendReceiptEmail(user.email, { ...parsed, source: "upload" }).catch(() => {});
      }
    }
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
