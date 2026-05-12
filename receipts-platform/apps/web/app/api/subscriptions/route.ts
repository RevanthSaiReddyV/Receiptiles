import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@receipts/db';
import { syncSubscriptions } from '@/lib/subscriptions/detect';

/**
 * GET /api/subscriptions
 * List user's detected subscriptions.
 *
 * POST /api/subscriptions
 * Trigger subscription detection/sync.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get('status') || 'ACTIVE';

  const subscriptions = await db.subscription.findMany({
    where: {
      userId: session.user.id,
      ...(status !== 'ALL' && { status: status as any }),
    },
    include: {
      alerts: {
        where: { dismissedAt: null },
        orderBy: { scheduledFor: 'desc' },
        take: 3,
      },
      charges: {
        orderBy: { chargedAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { nextExpectedAt: 'asc' },
  });

  // Summary stats
  const activeCount = subscriptions.filter(s => s.status === 'ACTIVE').length;
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

  const annualTotal = monthlyTotal * 12;

  return NextResponse.json({
    subscriptions,
    summary: {
      activeCount,
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      annualTotal: Math.round(annualTotal * 100) / 100,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncSubscriptions(session.user.id);

    return NextResponse.json({
      message: 'Subscription detection complete',
      ...result,
    });
  } catch (error) {
    console.error('[Subscriptions] Sync error:', error);
    return NextResponse.json({ error: 'Detection failed' }, { status: 500 });
  }
}
