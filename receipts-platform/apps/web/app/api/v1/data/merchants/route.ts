import { NextRequest, NextResponse } from 'next/server';
import { authenticateDataApiKey, checkRateLimit, getHistoryDateLimit } from '@/lib/data-api/auth';
import { getMerchantAggregates, type AggregateFilters } from '@/lib/data-api/queries';

/**
 * GET /api/v1/data/merchants
 *
 * Returns anonymized merchant performance aggregates.
 * k-anonymity enforced: minimum 50 unique users per merchant.
 *
 * Query params:
 *   startDate - ISO date (required)
 *   endDate   - ISO date (required)
 *   category  - filter by category
 *   sortBy    - revenue | transactions | users (default: revenue)
 *   limit     - max results 1-500 (default: 100)
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
  const category = params.get('category') || undefined;
  const sortBy = (params.get('sortBy') || 'revenue') as 'revenue' | 'transactions' | 'users';
  const limit = Math.min(Math.max(parseInt(params.get('limit') || '100'), 1), 500);

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
  };

  try {
    const data = await getMerchantAggregates(filters, limit, sortBy);

    return NextResponse.json({
      data,
      meta: {
        startDate: effectiveStart.toISOString().split('T')[0],
        endDate: filters.endDate.toISOString().split('T')[0],
        sortBy,
        limit,
        filters: { category },
        kAnonymity: 50,
        rateLimit: { remaining: rateCheck.remaining, resetAt: rateCheck.resetAt },
      },
    });
  } catch (error) {
    console.error('[Data API] Merchants error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
