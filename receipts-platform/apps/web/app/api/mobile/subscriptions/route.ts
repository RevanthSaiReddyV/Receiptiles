import { NextRequest, NextResponse } from 'next/server';
import { db } from '@receipts/db';
import { syncSubscriptions } from '@/lib/subscriptions/detect';
import { getPendingAlerts, dismissAlert } from '@/lib/subscriptions/alerts';

/**
 * Mobile Subscriptions API
 *
 * GET  /api/mobile/subscriptions - List subscriptions + alerts
 * POST /api/mobile/subscriptions - Trigger sync + return results
 * PATCH /api/mobile/subscriptions - Update subscription (toggle alerts, cancel)
 */

async function authenticateUser(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.replace('Bearer ', '');

  const session = await db.session.findFirst({
    where: { sessionToken: token, expires: { gt: new Date() } },
    include: { user: true },
  });

  return session?.user || null;
}

export async function GET(request: NextRequest) {
  const user = await authenticateUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [subscriptions, alerts] = await Promise.all([
    db.subscription.findMany({
      where: { userId: user.id, status: { in: ['ACTIVE', 'PAUSED'] } },
      include: {
        charges: {
          orderBy: { chargedAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { nextExpectedAt: 'asc' },
    }),
    getPendingAlerts(user.id),
  ]);

  // Calculate monthly/annual totals
  const monthlyTotal = subscriptions
    .filter(s => s.status === 'ACTIVE')
    .reduce((sum, s) => {
      switch (s.frequency) {
        case 'WEEKLY': return sum + s.amount * 4.33;
        case 'BIWEEKLY': return sum + s.amount * 2.17;
        case 'MONTHLY': return sum + s.amount;
        case 'QUARTERLY': return sum + s.amount / 3;
        case 'ANNUAL': return sum + s.amount / 12;
        default: return sum + s.amount;
      }
    }, 0);

  return NextResponse.json({
    subscriptions,
    alerts,
    summary: {
      activeCount: subscriptions.filter(s => s.status === 'ACTIVE').length,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      annualTotal: Math.round(monthlyTotal * 12 * 100) / 100,
      alertCount: alerts.length,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await authenticateUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await syncSubscriptions(user.id);

  // Return fresh data after sync
  const subscriptions = await db.subscription.findMany({
    where: { userId: user.id, status: { in: ['ACTIVE', 'PAUSED'] } },
    orderBy: { nextExpectedAt: 'asc' },
  });

  return NextResponse.json({
    message: 'Subscriptions synced',
    result,
    subscriptions,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await authenticateUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { subscriptionId, alertId, action } = body;

  // Dismiss alert
  if (alertId && action === 'dismiss') {
    const success = await dismissAlert(alertId, user.id);
    return NextResponse.json({ success });
  }

  // Update subscription
  if (subscriptionId) {
    const sub = await db.subscription.findFirst({
      where: { id: subscriptionId, userId: user.id },
    });
    if (!sub) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updates: any = {};
    if (action === 'pause') updates.status = 'PAUSED';
    if (action === 'resume') updates.status = 'ACTIVE';
    if (action === 'cancel') {
      updates.status = 'CANCELLED';
      updates.cancelledAt = new Date();
    }
    if (action === 'toggle_alerts') {
      updates.alertsEnabled = !sub.alertsEnabled;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await db.subscription.update({
      where: { id: sub.id },
      data: updates,
    });

    return NextResponse.json({ subscription: updated });
  }

  return NextResponse.json({ error: 'subscriptionId or alertId required' }, { status: 400 });
}
