import { NextRequest, NextResponse } from 'next/server';
import { authenticateDataApiKey, checkRateLimit, getHistoryDateLimit } from '@/lib/data-api/auth';
import { getCategoryAggregates, type AggregateFilters } from '@/lib/data-api/queries';

/**
 * GET /api/v1/data/categories
 *
 * Returns anonymized spending by category with YoY growth.
 * k-anonymity enforced: minimum 50 unique users per category.
 *
 * Query params:
 *   startDate - ISO date (required)
 *   endDate   - ISO date (required)
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
  };

  try {
    const data = await getCategoryAggregates(filters);

    return NextResponse.json({
      data,
      meta: {
        startDate: effectiveStart.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
        kAnonymity: 50,
        includesYoyGrowth: true,
        rateLimit: { remaining: rateCheck.remaining, resetAt: rateCheck.resetAt },
      },
    });
  } catch (error) {
    console.error('[Data API] Categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
