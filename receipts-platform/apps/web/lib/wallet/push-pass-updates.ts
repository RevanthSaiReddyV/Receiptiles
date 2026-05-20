import { db } from "@receipts/db";
import { pushPassUpdate } from "./apns-push";

/**
 * Notify all of a user's active Apple Wallet passes to refresh.
 *
 * Finds all active wallet passes for the user that have a pushToken,
 * then sends an APNs push to each one. This triggers Apple Wallet to
 * call our webServiceURL to fetch the updated pass data.
 *
 * Logs but does not throw on failure — this is a best-effort operation.
 */
export async function notifyAllUserPasses(userId: string): Promise<void> {
  try {
    const passes = await db.walletPass.findMany({
      where: {
        userId,
        platform: "apple",
        isActive: true,
        pushToken: { not: null },
      },
      select: {
        id: true,
        pushToken: true,
        serialNumber: true,
      },
    });

    if (passes.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      passes.map(async (pass) => {
        if (!pass.pushToken) return;
        const success = await pushPassUpdate(pass.pushToken);
        if (success) {
          console.log(
            `[Pass Push] Notified pass ${pass.serialNumber.slice(0, 12)}...`
          );
        } else {
          console.warn(
            `[Pass Push] Failed to notify pass ${pass.serialNumber.slice(0, 12)}...`
          );
        }
      })
    );

    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.warn(
        `[Pass Push] ${failures.length}/${passes.length} push notifications failed for user ${userId.slice(0, 8)}...`
      );
    }
  } catch (error) {
    console.error(
      "[Pass Push] Error notifying user passes:",
      error instanceof Error ? error.message : error
    );
    // Don't throw — this is non-critical
  }
}
