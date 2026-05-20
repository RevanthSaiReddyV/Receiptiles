import { db } from "@receipts/db";
import { generateOrderFromReceipt } from "./apple-order";
import { notifyAllUserPasses } from "./push-pass-updates";

/**
 * Sync a receipt to Apple Wallet as an Order.
 *
 * Checks if the user has an active Apple Wallet pass, and if so,
 * prepares and validates the order data. Apple Wallet fetches orders
 * via the webServiceURL when the pass is updated.
 *
 * This function is safe to call in background processing (waitUntil)
 * since it performs read-heavy work and only validates data readiness.
 */
export async function syncReceiptToWalletOrder(
  receiptId: string,
  userId: string
): Promise<void> {
  // Check if user has an active Apple wallet pass
  const walletPass = await db.walletPass.findFirst({
    where: {
      userId,
      platform: "apple",
      isActive: true,
    },
  });

  if (!walletPass) {
    // User has no Apple wallet pass — nothing to sync
    return;
  }

  // Generate the order to validate the receipt data is suitable for Apple Orders.
  // This does not persist anything separately — Apple Wallet will fetch the order
  // via GET /api/wallet/orders/[id] when it polls for updates.
  try {
    await generateOrderFromReceipt(receiptId);

    // Update the wallet pass lastUpdatedAt to signal a change.
    // When Apple Wallet polls the webServiceURL, it checks this timestamp
    // and fetches updated order data if newer than what it has.
    await db.walletPass.update({
      where: { id: walletPass.id },
      data: {
        lastUpdatedAt: new Date(),
        receiptCount: { increment: 1 },
      },
    });

    // Push to APNs so the pass refreshes instantly on the user's device
    await notifyAllUserPasses(userId);
  } catch (error) {
    // Order generation failed — receipt might be missing required fields.
    // This is non-critical; the receipt is still saved, just not synced to wallet.
    console.error(
      `[Order Sync] Failed to sync receipt ${receiptId} to wallet order:`,
      error instanceof Error ? error.message : error
    );
  }
}
