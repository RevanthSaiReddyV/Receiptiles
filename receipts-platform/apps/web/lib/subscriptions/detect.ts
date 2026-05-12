import { db } from '@receipts/db';

/**
 * Subscription Detection Engine
 *
 * Analyzes receipt history to identify recurring charges.
 * Uses pattern matching on merchant + amount + frequency.
 *
 * Detection rules:
 * 1. Same merchant + same amount (±5%) appearing 2+ times
 * 2. Intervals between charges cluster around a known frequency
 * 3. Confidence increases with more data points
 *
 * Known subscription merchants get boosted confidence.
 */

// Known subscription services for confidence boosting
const KNOWN_SUBSCRIPTION_MERCHANTS: Record<string, { frequency: string; category: string }> = {
  'netflix': { frequency: 'MONTHLY', category: 'Streaming' },
  'spotify': { frequency: 'MONTHLY', category: 'Streaming' },
  'hulu': { frequency: 'MONTHLY', category: 'Streaming' },
  'disney+': { frequency: 'MONTHLY', category: 'Streaming' },
  'apple music': { frequency: 'MONTHLY', category: 'Streaming' },
  'youtube premium': { frequency: 'MONTHLY', category: 'Streaming' },
  'amazon prime': { frequency: 'ANNUAL', category: 'Shopping' },
  'costco': { frequency: 'ANNUAL', category: 'Shopping' },
  'adobe': { frequency: 'MONTHLY', category: 'Software' },
  'microsoft 365': { frequency: 'MONTHLY', category: 'Software' },
  'dropbox': { frequency: 'MONTHLY', category: 'Software' },
  'icloud': { frequency: 'MONTHLY', category: 'Cloud Storage' },
  'google one': { frequency: 'MONTHLY', category: 'Cloud Storage' },
  'planet fitness': { frequency: 'MONTHLY', category: 'Fitness' },
  'peloton': { frequency: 'MONTHLY', category: 'Fitness' },
  'nyt': { frequency: 'MONTHLY', category: 'News' },
  'new york times': { frequency: 'MONTHLY', category: 'News' },
  'wall street journal': { frequency: 'MONTHLY', category: 'News' },
  'chatgpt': { frequency: 'MONTHLY', category: 'AI' },
  'openai': { frequency: 'MONTHLY', category: 'AI' },
  'claude': { frequency: 'MONTHLY', category: 'AI' },
};

// Frequency detection windows (in days)
const FREQUENCY_WINDOWS = {
  WEEKLY: { min: 5, max: 9, ideal: 7 },
  BIWEEKLY: { min: 12, max: 17, ideal: 14 },
  MONTHLY: { min: 26, max: 35, ideal: 30 },
  QUARTERLY: { min: 80, max: 100, ideal: 91 },
  ANNUAL: { min: 350, max: 380, ideal: 365 },
};

type FrequencyKey = keyof typeof FREQUENCY_WINDOWS;

interface DetectedSubscription {
  merchantName: string;
  amount: number;
  frequency: FrequencyKey;
  confidence: number;
  category: string | null;
  charges: Array<{ receiptId: string; amount: number; date: Date }>;
  nextExpectedAt: Date;
  firstChargeAt: Date;
  lastChargeAt: Date;
}

/**
 * Detect subscriptions for a user by analyzing their receipt history.
 */
export async function detectSubscriptions(userId: string): Promise<DetectedSubscription[]> {
  // Get all receipts grouped by merchant
  const receipts = await db.receipt.findMany({
    where: { userId },
    select: {
      id: true,
      merchantCanonicalName: true,
      total: true,
      purchasedAt: true,
      merchantCategory: true,
    },
    orderBy: { purchasedAt: 'asc' },
  });

  // Group by normalized merchant name
  const merchantGroups = new Map<string, typeof receipts>();
  for (const receipt of receipts) {
    const key = normalizeMerchant(receipt.merchantCanonicalName);
    if (!merchantGroups.has(key)) {
      merchantGroups.set(key, []);
    }
    merchantGroups.get(key)!.push(receipt);
  }

  const detected: DetectedSubscription[] = [];

  for (const [merchant, merchantReceipts] of merchantGroups) {
    if (merchantReceipts.length < 2) continue;

    // Group by similar amounts (±5%)
    const amountGroups = groupByAmount(merchantReceipts);

    for (const group of amountGroups) {
      if (group.length < 2) continue;

      // Detect frequency from intervals
      const result = detectFrequency(group);
      if (!result) continue;

      const { frequency, confidence: freqConfidence } = result;

      // Calculate confidence
      let confidence = freqConfidence;

      // Boost for known subscription merchants
      const knownInfo = findKnownMerchant(merchant);
      if (knownInfo) {
        confidence = Math.min(1, confidence + 0.2);
        if (knownInfo.frequency === frequency) {
          confidence = Math.min(1, confidence + 0.1);
        }
      }

      // Boost for more data points
      if (group.length >= 4) confidence = Math.min(1, confidence + 0.1);
      if (group.length >= 6) confidence = Math.min(1, confidence + 0.05);

      // Only report if confidence is above threshold
      if (confidence < 0.5) continue;

      const avgAmount = group.reduce((sum, r) => sum + r.total, 0) / group.length;
      const lastCharge = group[group.length - 1];
      const nextExpected = predictNextCharge(lastCharge.purchasedAt, frequency);

      detected.push({
        merchantName: merchantReceipts[0].merchantCanonicalName,
        amount: Math.round(avgAmount * 100) / 100,
        frequency,
        confidence: Math.round(confidence * 100) / 100,
        category: knownInfo?.category || merchantReceipts[0].merchantCategory,
        charges: group.map(r => ({
          receiptId: r.id,
          amount: r.total,
          date: r.purchasedAt,
        })),
        nextExpectedAt: nextExpected,
        firstChargeAt: group[0].purchasedAt,
        lastChargeAt: lastCharge.purchasedAt,
      });
    }
  }

  // Sort by confidence descending
  detected.sort((a, b) => b.confidence - a.confidence);
  return detected;
}

/**
 * Sync detected subscriptions to database.
 * Creates new, updates existing, marks cancelled.
 */
export async function syncSubscriptions(userId: string): Promise<{
  created: number;
  updated: number;
  cancelled: number;
}> {
  const detected = await detectSubscriptions(userId);
  let created = 0, updated = 0, cancelled = 0;

  // Get existing subscriptions
  const existing = await db.subscription.findMany({
    where: { userId, status: { in: ['ACTIVE', 'PAUSED'] } },
  });

  const existingMap = new Map(
    existing.map(s => [`${normalizeMerchant(s.merchantName)}:${s.frequency}`, s])
  );

  // Upsert detected subscriptions
  for (const sub of detected) {
    const key = `${normalizeMerchant(sub.merchantName)}:${sub.frequency}`;
    const existingSub = existingMap.get(key);

    if (existingSub) {
      // Update existing
      await db.subscription.update({
        where: { id: existingSub.id },
        data: {
          amount: sub.amount,
          confidence: sub.confidence,
          nextExpectedAt: sub.nextExpectedAt,
          lastChargeAt: sub.lastChargeAt,
          category: sub.category,
        },
      });
      existingMap.delete(key);
      updated++;
    } else {
      // Create new
      await db.subscription.create({
        data: {
          userId,
          merchantName: sub.merchantName,
          category: sub.category,
          amount: sub.amount,
          frequency: sub.frequency,
          confidence: sub.confidence,
          nextExpectedAt: sub.nextExpectedAt,
          lastChargeAt: sub.lastChargeAt,
          firstDetectedAt: new Date(),
          status: 'ACTIVE',
        },
      });
      created++;

      // Create "new subscription detected" alert
      const newSub = await db.subscription.findFirst({
        where: { userId, merchantName: sub.merchantName, frequency: sub.frequency },
        orderBy: { createdAt: 'desc' },
      });
      if (newSub) {
        await db.subscriptionAlert.create({
          data: {
            subscriptionId: newSub.id,
            type: 'new_detected',
            title: `New subscription detected`,
            message: `We detected a ${sub.frequency.toLowerCase()} charge of $${sub.amount.toFixed(2)} from ${sub.merchantName}.`,
            amount: sub.amount,
            scheduledFor: new Date(),
          },
        });
      }
    }
  }

  // Mark subscriptions not detected anymore as potentially cancelled
  for (const [, orphaned] of existingMap) {
    const daysSinceLastCharge = orphaned.lastChargeAt
      ? (Date.now() - orphaned.lastChargeAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    const expectedInterval = FREQUENCY_WINDOWS[orphaned.frequency as FrequencyKey]?.ideal || 30;

    // If more than 2x the expected interval has passed, mark as potentially cancelled
    if (daysSinceLastCharge > expectedInterval * 2) {
      await db.subscription.update({
        where: { id: orphaned.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      cancelled++;
    }
  }

  return { created, updated, cancelled };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeMerchant(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function findKnownMerchant(normalized: string): { frequency: string; category: string } | null {
  for (const [key, info] of Object.entries(KNOWN_SUBSCRIPTION_MERCHANTS)) {
    if (normalized.includes(key)) return info;
  }
  return null;
}

function groupByAmount(receipts: Array<{ id: string; total: number; purchasedAt: Date; merchantCanonicalName: string; merchantCategory: string }>) {
  const groups: Array<typeof receipts> = [];

  for (const receipt of receipts) {
    let placed = false;
    for (const group of groups) {
      const avgAmount = group.reduce((s, r) => s + r.total, 0) / group.length;
      // Within 5% tolerance
      if (Math.abs(receipt.total - avgAmount) / avgAmount <= 0.05) {
        group.push(receipt);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([receipt]);
    }
  }

  return groups;
}

function detectFrequency(
  receipts: Array<{ purchasedAt: Date }>
): { frequency: FrequencyKey; confidence: number } | null {
  if (receipts.length < 2) return null;

  // Calculate intervals between consecutive charges
  const intervals: number[] = [];
  for (let i = 1; i < receipts.length; i++) {
    const days = (receipts[i].purchasedAt.getTime() - receipts[i - 1].purchasedAt.getTime())
      / (1000 * 60 * 60 * 24);
    intervals.push(days);
  }

  // Try each frequency window
  let bestMatch: { frequency: FrequencyKey; confidence: number } | null = null;

  for (const [freq, window] of Object.entries(FREQUENCY_WINDOWS) as Array<[FrequencyKey, typeof FREQUENCY_WINDOWS[FrequencyKey]]>) {
    const matchingIntervals = intervals.filter(d => d >= window.min && d <= window.max);
    const matchRate = matchingIntervals.length / intervals.length;

    if (matchRate >= 0.6) { // At least 60% of intervals match
      // Calculate confidence based on consistency
      const avgInterval = matchingIntervals.reduce((s, d) => s + d, 0) / matchingIntervals.length;
      const deviation = matchingIntervals.reduce((s, d) => s + Math.abs(d - avgInterval), 0) / matchingIntervals.length;
      const normalizedDev = deviation / window.ideal;

      // Higher confidence = more consistent intervals + higher match rate
      const confidence = matchRate * (1 - Math.min(normalizedDev, 0.5));

      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { frequency: freq, confidence };
      }
    }
  }

  return bestMatch;
}

function predictNextCharge(lastCharge: Date, frequency: FrequencyKey): Date {
  const ideal = FREQUENCY_WINDOWS[frequency].ideal;
  const next = new Date(lastCharge);
  next.setDate(next.getDate() + ideal);
  return next;
}
