import { NextRequest, NextResponse } from 'next/server';
import { db } from '@receipts/db';
import { syncSubscriptions } from '@/lib/subscriptions/detect';
import { generateRenewalAlerts, detectMissedCharges } from '@/lib/subscriptions/alerts';

/**
 * GET /api/cron/subscriptions
 *
 * Daily cron job that:
 * 1. Re-runs subscription detection for active users
 * 2. Generates upcoming renewal alerts
 * 3. Detects missed charges
 *
 * Vercel Cron config: runs daily at 6 AM UTC
 * vercel.json: { "crons": [{ "path": "/api/cron/subscriptions", "schedule": "0 6 * * *" }] }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let totalCreated = 0, totalUpdated = 0, totalCancelled = 0;

  try {
    // Get users with active subscriptions or recent receipts (active in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await db.user.findMany({
      where: {
        OR: [
          { subscriptions: { some: { status: 'ACTIVE' } } },
          { receipts: { some: { purchasedAt: { gte: thirtyDaysAgo } } } },
        ],
      },
      select: { id: true },
    });

    // Sync subscriptions for each user (batch in groups of 10)
    const batchSize = 10;
    for (let i = 0; i < activeUsers.length; i += batchSize) {
      const batch = activeUsers.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(user => syncSubscriptions(user.id))
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalCreated += result.value.created;
          totalUpdated += result.value.updated;
          totalCancelled += result.value.cancelled;
        }
      }
    }

    // Generate alerts
    const [renewalAlerts, missedAlerts] = await Promise.all([
      generateRenewalAlerts(),
      detectMissedCharges(),
    ]);

    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      usersProcessed: activeUsers.length,
      subscriptions: {
        created: totalCreated,
        updated: totalUpdated,
        cancelled: totalCancelled,
      },
      alerts: {
        renewals: renewalAlerts,
        missed: missedAlerts,
      },
      elapsedMs: elapsed,
    });
  } catch (error) {
    console.error('[Cron] Subscription detection error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', elapsed: Date.now() - startTime },
      { status: 500 }
    );
  }
}
