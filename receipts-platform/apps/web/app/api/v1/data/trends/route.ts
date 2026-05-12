import { NextRequest, NextResponse } from 'next/server';
import { authenticateDataApiKey, checkRateLimit, getHistoryDateLimit } from '@/lib/data-api/auth';
import { getSpendingTrend, getTopItems, type AggregateFilters } from '@/lib/data-api/queries';

/**
 * GET /api/v1/data/trends
 *
 * Returns anonymized spending trends (time series) and top items.
 * k-anonymity enforced: minimum 50 unique users per data point.
 *
 * Query params:
 *   startDate - ISO date (required)
 *   endDate   - ISO date (required)
 *   metric    - total_spend | avg_transaction | transaction_count | unique_users
 *   category  - filter by category
 *   merchant  - filter by merchant name
 *   type      - timeseries | top_items (default: timeseries)
 *   limit     - max items for top_items (default: 50)
 */
export async function GET(request: NextRequest) {
  const apiKey = await authenticateDataApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  const rateCheck = checkRateLimit(apiKey);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetAt: rateCheck.resetAt },
      { status: 429 }
    );
  }

  const params = request.nextUrl.searchParams;
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const metric = (params.get('metric') || 'total_spend') as
    'total_spend' | 'avg_transaction' | 'transaction_count' | 'unique_users';
  const category = params.get('category') || undefined;
  const merchant = params.get('merchant') || undefined;
  const type = params.get('type') || 'timeseries';
  const limit = Math.min(Math.max(parseInt(params.get('limit') || '50'), 1), 200);

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate are required' },
      { status: 400 }
    );
  }

  const historyLimit = getHistoryDateLimit(apiKey);
  const requestedStart = new Date(startDate);
  const effectiveStart = requestedStart < historyLimit ? historyLimit : requestedStart;

  const filters: AggregateFilters = {
    startDate: effectiveStart,
    endDate: new Date(endDate),
    category,
    merchantName: merchant,
  };

  try {
    if (type === 'top_items') {
      // Enterprise tier only for item-level data
      if (apiKey.tier === 'trial') {
        return NextResponse.json(
          { error: 'Item-level data requires standard or enterprise tier' },
          { status: 403 }
        );
      }

      const data = await getTopItems(filters, limit);
      return NextResponse.json({
        data,
        meta: {
          startDate: effectiveStart.toISOString().split('T')[0],
          endDate: filters.endDate.toISOString().split('T')[0],
          type: 'top_items',
          limit,
          filters: { category, merchant },
          kAnonymity: 50,
          rateLimit: { remaining: rateCheck.remaining, resetAt: rateCheck.resetAt },
        },
      });
    }

    // Default: time series trend
    const data = await getSpendingTrend(filters, metric);

    return NextResponse.json({
      data,
      meta: {
        startDate: effectiveStart.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
        type: 'timeseries',
        metric,
        granularity: 'week',
        filters: { category, merchant },
        kAnonymity: 50,
        rateLimit: { remaining: rateCheck.remaining, resetAt: rateCheck.resetAt },
      },
    });
  } catch (error) {
    console.error('[Data API] Trends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
