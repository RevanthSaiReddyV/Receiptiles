import { NextRequest, NextResponse } from 'next/server';
import { authenticateDataApiKey, checkRateLimit, getHistoryDateLimit } from '@/lib/data-api/auth';
import { getSpendingAggregates, type AggregateFilters } from '@/lib/data-api/queries';

/**
 * GET /api/v1/data/aggregates
 *
 * Returns anonymized spending aggregates over time.
 * k-anonymity enforced: minimum 50 unique users per bucket.
 *
 * Query params:
 *   startDate  - ISO date (required)
 *   endDate    - ISO date (required)
 *   granularity - day | week | month (default: week)
 *   category   - filter by category
 *   merchant   - filter by merchant name (fuzzy)
 *   region     - filter by region (zip prefix, 3 digits)
 */
export async function GET(request: NextRequest) {
  // Authenticate
  const apiKey = await authenticateDataApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Invalid or missing API key. Use Bearer dat_<key> format.' },
      { status: 401 }
    );
  }

  // Rate limit
  const rateCheck = checkRateLimit(apiKey);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetAt: rateCheck.resetAt },
      { status: 429, headers: { 'X-RateLimit-Reset': rateCheck.resetAt.toISOString() } }
    );
  }

  // Parse params
  const params = request.nextUrl.searchParams;
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const granularity = (params.get('granularity') || 'week') as 'day' | 'week' | 'month';
  const category = params.get('category') || undefined;
  const merchant = params.get('merchant') || undefined;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate are required (ISO format)' },
      { status: 400 }
    );
  }

  // Enforce history limit
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
    const data = await getSpendingAggregates(filters, granularity);

    return NextResponse.json({
      data,
      meta: {
        startDate: effectiveStart.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
        granularity,
        filters: { category, merchant },
        kAnonymity: 50,
        rateLimit: { remaining: rateCheck.remaining, resetAt: rateCheck.resetAt },
      },
    });
  } catch (error) {
    console.error('[Data API] Aggregates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
