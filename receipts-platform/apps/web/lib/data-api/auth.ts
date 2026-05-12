import { NextRequest } from 'next/server';
import { db } from '@receipts/db';

/**
 * Data API Authentication & Rate Limiting
 *
 * Data API keys are separate from device keys and user sessions.
 * Format: dat_<hex> — issued to approved data partners.
 *
 * Tiers:
 * - trial:      100 requests/day, 30-day history, basic aggregates
 * - standard:   10,000 requests/day, 1-year history, full aggregates
 * - enterprise: unlimited requests, full history, raw anonymized data
 */

export type DataApiTier = 'trial' | 'standard' | 'enterprise';

export interface DataApiKey {
  id: string;
  partnerId: string;
  partnerName: string;
  tier: DataApiTier;
  rateLimit: number; // requests per day
  historyDays: number;
  active: boolean;
}

// In-memory rate limit tracking (would use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const TIER_LIMITS: Record<DataApiTier, { rateLimit: number; historyDays: number }> = {
  trial: { rateLimit: 100, historyDays: 30 },
  standard: { rateLimit: 10000, historyDays: 365 },
  enterprise: { rateLimit: 1000000, historyDays: 3650 },
};

export async function authenticateDataApiKey(request: NextRequest): Promise<DataApiKey | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer dat_')) return null;

  const apiKey = auth.replace('Bearer ', '');

  // Look up API key in database
  // Using a generic approach since we'll add DataApiKey model
  const keyRecord = await db.$queryRaw<Array<{
    id: string;
    partner_id: string;
    partner_name: string;
    tier: string;
    active: boolean;
  }>>`
    SELECT id, partner_id, partner_name, tier, active
    FROM "DataApiKey"
    WHERE key = ${apiKey} AND active = true
    LIMIT 1
  `.catch(() => []);

  if (!keyRecord || keyRecord.length === 0) return null;

  const record = keyRecord[0];
  const tier = record.tier as DataApiTier;
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.trial;

  return {
    id: record.id,
    partnerId: record.partner_id,
    partnerName: record.partner_name,
    tier,
    rateLimit: limits.rateLimit,
    historyDays: limits.historyDays,
    active: record.active,
  };
}

export function checkRateLimit(apiKey: DataApiKey): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const resetAt = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const entry = rateLimitMap.get(apiKey.id);

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitMap.set(apiKey.id, { count: 1, resetAt: resetAt.getTime() });
    return { allowed: true, remaining: apiKey.rateLimit - 1, resetAt };
  }

  if (entry.count >= apiKey.rateLimit) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.resetAt) };
  }

  entry.count++;
  return { allowed: true, remaining: apiKey.rateLimit - entry.count, resetAt };
}

export function getHistoryDateLimit(apiKey: DataApiKey): Date {
  const limit = new Date();
  limit.setDate(limit.getDate() - apiKey.historyDays);
  return limit;
}
