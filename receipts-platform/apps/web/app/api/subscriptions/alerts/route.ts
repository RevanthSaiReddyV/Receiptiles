import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPendingAlerts, dismissAlert } from '@/lib/subscriptions/alerts';

/**
 * GET /api/subscriptions/alerts
 * Get pending subscription alerts for the user.
 *
 * PATCH /api/subscriptions/alerts
 * Dismiss an alert.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alerts = await getPendingAlerts(session.user.id);

  return NextResponse.json({ alerts });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { alertId, action } = body;

  if (!alertId) {
    return NextResponse.json({ error: 'alertId required' }, { status: 400 });
  }

  if (action === 'dismiss') {
    const success = await dismissAlert(alertId, session.user.id);
    if (!success) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
