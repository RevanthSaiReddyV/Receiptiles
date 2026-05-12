import { db } from '@receipts/db';

/**
 * Subscription Alert Engine
 *
 * Generates alerts for:
 * - upcoming_renewal: Charge expected in next 3 days
 * - price_increase: Amount increased vs last charge
 * - missed_charge: Expected charge didn't appear
 * - new_detected: New recurring pattern found
 */

/**
 * Generate upcoming renewal alerts for all users with active subscriptions.
 * Should be run daily via cron.
 */
export async function generateRenewalAlerts(): Promise<number> {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const now = new Date();

  // Find subscriptions renewing in next 3 days that don't already have an alert
  const upcomingSubs = await db.subscription.findMany({
    where: {
      status: 'ACTIVE',
      alertsEnabled: true,
      nextExpectedAt: {
        gte: now,
        lte: threeDaysFromNow,
      },
    },
    include: {
      alerts: {
        where: {
          type: 'upcoming_renewal',
          scheduledFor: { gte: now },
          dismissedAt: null,
        },
      },
    },
  });

  let created = 0;

  for (const sub of upcomingSubs) {
    // Skip if already has an active alert
    if (sub.alerts.length > 0) continue;

    await db.subscriptionAlert.create({
      data: {
        subscriptionId: sub.id,
        type: 'upcoming_renewal',
        title: `${sub.merchantName} renewing soon`,
        message: `Your ${sub.frequency.toLowerCase()} subscription of $${sub.amount.toFixed(2)} is expected to renew on ${sub.nextExpectedAt!.toLocaleDateString()}.`,
        amount: sub.amount,
        scheduledFor: new Date(), // Alert now for charges within 3 days
      },
    });
    created++;
  }

  return created;
}

/**
 * Check for missed charges (subscriptions that should have renewed but didn't).
 * Should be run daily via cron.
 */
export async function detectMissedCharges(): Promise<number> {
  const now = new Date();
  const gracePeriod = 5; // days after expected before flagging

  // Subscriptions where nextExpectedAt is more than gracePeriod days in the past
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - gracePeriod);

  const missedSubs = await db.subscription.findMany({
    where: {
      status: 'ACTIVE',
      alertsEnabled: true,
      nextExpectedAt: {
        lt: cutoff,
      },
    },
    include: {
      alerts: {
        where: {
          type: 'missed_charge',
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
    },
  });

  let created = 0;

  for (const sub of missedSubs) {
    // Skip if already alerted recently
    if (sub.alerts.length > 0) continue;

    await db.subscriptionAlert.create({
      data: {
        subscriptionId: sub.id,
        type: 'missed_charge',
        title: `Missed charge from ${sub.merchantName}`,
        message: `Expected a $${sub.amount.toFixed(2)} charge on ${sub.nextExpectedAt!.toLocaleDateString()} but it hasn't appeared. The subscription may have been cancelled or payment failed.`,
        amount: sub.amount,
        scheduledFor: new Date(),
      },
    });
    created++;
  }

  return created;
}

/**
 * Detect price increases when a new charge comes in at a different amount.
 */
export async function checkForPriceChange(
  subscriptionId: string,
  newAmount: number
): Promise<void> {
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!sub || !sub.alertsEnabled) return;

  const priceDiff = newAmount - sub.amount;
  const percentChange = (priceDiff / sub.amount) * 100;

  // Only alert if increase > 5%
  if (percentChange > 5) {
    await db.subscriptionAlert.create({
      data: {
        subscriptionId: sub.id,
        type: 'price_increase',
        title: `${sub.merchantName} price increased`,
        message: `Your ${sub.merchantName} subscription increased from $${sub.amount.toFixed(2)} to $${newAmount.toFixed(2)} (+${percentChange.toFixed(0)}%).`,
        amount: newAmount,
        scheduledFor: new Date(),
      },
    });

    // Update the subscription amount
    await db.subscription.update({
      where: { id: sub.id },
      data: { amount: newAmount },
    });
  }
}

/**
 * Get pending (unsent, undismissed) alerts for a user.
 */
export async function getPendingAlerts(userId: string) {
  return db.subscriptionAlert.findMany({
    where: {
      subscription: { userId },
      sentAt: null,
      dismissedAt: null,
      scheduledFor: { lte: new Date() },
    },
    include: {
      subscription: {
        select: {
          merchantName: true,
          amount: true,
          frequency: true,
        },
      },
    },
    orderBy: { scheduledFor: 'desc' },
  });
}

/**
 * Dismiss an alert.
 */
export async function dismissAlert(alertId: string, userId: string): Promise<boolean> {
  const alert = await db.subscriptionAlert.findFirst({
    where: {
      id: alertId,
      subscription: { userId },
    },
  });

  if (!alert) return false;

  await db.subscriptionAlert.update({
    where: { id: alertId },
    data: { dismissedAt: new Date() },
  });

  return true;
}
