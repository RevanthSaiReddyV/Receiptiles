import { db } from '@receipts/db';

/**
 * Data Monetization Query Layer
 *
 * All queries return ANONYMIZED, AGGREGATED data only.
 * No individual user data, no PII, no transaction-level data.
 * Minimum aggregation: k=50 (at least 50 unique users in any bucket).
 */

const MIN_K_ANONYMITY = 50;

export interface AggregateFilters {
  startDate: Date;
  endDate: Date;
  category?: string;
  merchantName?: string;
  region?: string; // zip code prefix (first 3 digits only)
  minTransactions?: number;
}

export interface SpendingAggregate {
  period: string; // ISO date or week/month key
  transactionCount: number;
  uniqueUsers: number;
  totalSpend: number;
  averageTransaction: number;
  medianTransaction: number;
  p25Transaction: number;
  p75Transaction: number;
}

export interface MerchantAggregate {
  merchantName: string;
  category: string;
  transactionCount: number;
  uniqueUsers: number;
  totalRevenue: number;
  averageBasket: number;
  averageItemCount: number;
  repeatRate: number; // % of users with 2+ visits
}

export interface CategoryAggregate {
  category: string;
  transactionCount: number;
  uniqueUsers: number;
  totalSpend: number;
  averageTransaction: number;
  merchantCount: number;
  topMerchants: string[];
  yoyGrowth: number | null;
}

export interface TrendPoint {
  period: string;
  value: number;
  changePercent: number | null;
}

// ─── Spending Aggregates ────────────────────────────────────────────────────
export async function getSpendingAggregates(
  filters: AggregateFilters,
  granularity: 'day' | 'week' | 'month' = 'week'
): Promise<SpendingAggregate[]> {
  const truncFn = granularity === 'day'
    ? `date_trunc('day', r."purchasedAt")`
    : granularity === 'week'
    ? `date_trunc('week', r."purchasedAt")`
    : `date_trunc('month', r."purchasedAt")`;

  const results = await db.$queryRawUnsafe<Array<{
    period: Date;
    transaction_count: bigint;
    unique_users: bigint;
    total_spend: number;
    avg_transaction: number;
    percentile_25: number;
    percentile_50: number;
    percentile_75: number;
  }>>(
    `SELECT
      ${truncFn} as period,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT r."userId") as unique_users,
      SUM(r.total) as total_spend,
      AVG(r.total) as avg_transaction,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY r.total) as percentile_25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY r.total) as percentile_50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY r.total) as percentile_75
    FROM "Receipt" r
    WHERE r."purchasedAt" >= $1
      AND r."purchasedAt" <= $2
      ${filters.category ? `AND r.category = $3` : ''}
      ${filters.merchantName ? `AND r."merchantName" ILIKE $${filters.category ? 4 : 3}` : ''}
    GROUP BY ${truncFn}
    HAVING COUNT(DISTINCT r."userId") >= ${MIN_K_ANONYMITY}
    ORDER BY period ASC`,
    filters.startDate,
    filters.endDate,
    ...(filters.category ? [filters.category] : []),
    ...(filters.merchantName ? [`%${filters.merchantName}%`] : [])
  );

  return results.map(row => ({
    period: row.period.toISOString().split('T')[0],
    transactionCount: Number(row.transaction_count),
    uniqueUsers: Number(row.unique_users),
    totalSpend: Number(row.total_spend),
    averageTransaction: Number(row.avg_transaction),
    medianTransaction: Number(row.percentile_50),
    p25Transaction: Number(row.percentile_25),
    p75Transaction: Number(row.percentile_75),
  }));
}

// ─── Merchant Aggregates ────────────────────────────────────────────────────
export async function getMerchantAggregates(
  filters: AggregateFilters,
  limit: number = 100,
  sortBy: 'revenue' | 'transactions' | 'users' = 'revenue'
): Promise<MerchantAggregate[]> {
  const orderCol = sortBy === 'revenue' ? 'total_revenue'
    : sortBy === 'transactions' ? 'transaction_count'
    : 'unique_users';

  const results = await db.$queryRawUnsafe<Array<{
    merchant_name: string;
    category: string | null;
    transaction_count: bigint;
    unique_users: bigint;
    total_revenue: number;
    avg_basket: number;
    avg_items: number;
    repeat_users: bigint;
  }>>(
    `SELECT
      r."merchantName" as merchant_name,
      r.category,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT r."userId") as unique_users,
      SUM(r.total) as total_revenue,
      AVG(r.total) as avg_basket,
      AVG(item_counts.item_count) as avg_items,
      COUNT(DISTINCT CASE WHEN user_visits.visit_count > 1 THEN r."userId" END) as repeat_users
    FROM "Receipt" r
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as item_count
      FROM "ReceiptItem" ri WHERE ri."receiptId" = r.id
    ) item_counts ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as visit_count
      FROM "Receipt" r2
      WHERE r2."userId" = r."userId"
        AND r2."merchantName" = r."merchantName"
        AND r2."purchasedAt" >= $1
        AND r2."purchasedAt" <= $2
    ) user_visits ON true
    WHERE r."purchasedAt" >= $1
      AND r."purchasedAt" <= $2
      ${filters.category ? `AND r.category = $3` : ''}
    GROUP BY r."merchantName", r.category
    HAVING COUNT(DISTINCT r."userId") >= ${MIN_K_ANONYMITY}
    ORDER BY ${orderCol} DESC
    LIMIT ${limit}`,
    filters.startDate,
    filters.endDate,
    ...(filters.category ? [filters.category] : [])
  );

  return results.map(row => ({
    merchantName: row.merchant_name,
    category: row.category || 'Uncategorized',
    transactionCount: Number(row.transaction_count),
    uniqueUsers: Number(row.unique_users),
    totalRevenue: Number(row.total_revenue),
    averageBasket: Number(row.avg_basket),
    averageItemCount: Number(row.avg_items),
    repeatRate: Number(row.unique_users) > 0
      ? Number(row.repeat_users) / Number(row.unique_users)
      : 0,
  }));
}

// ─── Category Aggregates ────────────────────────────────────────────────────
export async function getCategoryAggregates(
  filters: AggregateFilters
): Promise<CategoryAggregate[]> {
  const results = await db.$queryRawUnsafe<Array<{
    category: string;
    transaction_count: bigint;
    unique_users: bigint;
    total_spend: number;
    avg_transaction: number;
    merchant_count: bigint;
    top_merchants: string;
  }>>(
    `SELECT
      COALESCE(r.category, 'Uncategorized') as category,
      COUNT(*) as transaction_count,
      COUNT(DISTINCT r."userId") as unique_users,
      SUM(r.total) as total_spend,
      AVG(r.total) as avg_transaction,
      COUNT(DISTINCT r."merchantName") as merchant_count,
      STRING_AGG(DISTINCT r."merchantName", ',' ORDER BY r."merchantName") as top_merchants
    FROM "Receipt" r
    WHERE r."purchasedAt" >= $1
      AND r."purchasedAt" <= $2
    GROUP BY COALESCE(r.category, 'Uncategorized')
    HAVING COUNT(DISTINCT r."userId") >= ${MIN_K_ANONYMITY}
    ORDER BY total_spend DESC`,
    filters.startDate,
    filters.endDate
  );

  // Calculate YoY growth
  const prevYearStart = new Date(filters.startDate);
  prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
  const prevYearEnd = new Date(filters.endDate);
  prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);

  const prevResults = await db.$queryRawUnsafe<Array<{
    category: string;
    total_spend: number;
  }>>(
    `SELECT
      COALESCE(r.category, 'Uncategorized') as category,
      SUM(r.total) as total_spend
    FROM "Receipt" r
    WHERE r."purchasedAt" >= $1 AND r."purchasedAt" <= $2
    GROUP BY COALESCE(r.category, 'Uncategorized')
    HAVING COUNT(DISTINCT r."userId") >= ${MIN_K_ANONYMITY}`,
    prevYearStart,
    prevYearEnd
  );

  const prevMap = new Map(prevResults.map(r => [r.category, Number(r.total_spend)]));

  return results.map(row => {
    const topMerchants = row.top_merchants
      ? row.top_merchants.split(',').slice(0, 5)
      : [];
    const prevSpend = prevMap.get(row.category);
    const currentSpend = Number(row.total_spend);

    return {
      category: row.category,
      transactionCount: Number(row.transaction_count),
      uniqueUsers: Number(row.unique_users),
      totalSpend: currentSpend,
      averageTransaction: Number(row.avg_transaction),
      merchantCount: Number(row.merchant_count),
      topMerchants,
      yoyGrowth: prevSpend ? ((currentSpend - prevSpend) / prevSpend) * 100 : null,
    };
  });
}

// ─── Trend Analysis ─────────────────────────────────────────────────────────
export async function getSpendingTrend(
  filters: AggregateFilters,
  metric: 'total_spend' | 'avg_transaction' | 'transaction_count' | 'unique_users' = 'total_spend'
): Promise<TrendPoint[]> {
  const metricExpr = metric === 'total_spend' ? 'SUM(r.total)'
    : metric === 'avg_transaction' ? 'AVG(r.total)'
    : metric === 'transaction_count' ? 'COUNT(*)'
    : 'COUNT(DISTINCT r."userId")';

  const results = await db.$queryRawUnsafe<Array<{
    period: Date;
    value: number;
  }>>(
    `SELECT
      date_trunc('week', r."purchasedAt") as period,
      ${metricExpr} as value
    FROM "Receipt" r
    WHERE r."purchasedAt" >= $1
      AND r."purchasedAt" <= $2
      ${filters.category ? `AND r.category = $3` : ''}
      ${filters.merchantName ? `AND r."merchantName" ILIKE $${filters.category ? 4 : 3}` : ''}
    GROUP BY date_trunc('week', r."purchasedAt")
    HAVING COUNT(DISTINCT r."userId") >= ${MIN_K_ANONYMITY}
    ORDER BY period ASC`,
    filters.startDate,
    filters.endDate,
    ...(filters.category ? [filters.category] : []),
    ...(filters.merchantName ? [`%${filters.merchantName}%`] : [])
  );

  return results.map((row, i) => ({
    period: row.period.toISOString().split('T')[0],
    value: Number(row.value),
    changePercent: i > 0
      ? ((Number(row.value) - Number(results[i - 1].value)) / Number(results[i - 1].value)) * 100
      : null,
  }));
}

// ─── Item-Level Insights ────────────────────────────────────────────────────
export async function getTopItems(
  filters: AggregateFilters,
  limit: number = 50
): Promise<Array<{
  itemName: string;
  merchantName: string;
  category: string;
  totalQuantity: number;
  averagePrice: number;
  uniqueBuyers: number;
}>> {
  const results = await db.$queryRawUnsafe<Array<{
    item_name: string;
    merchant_name: string;
    category: string | null;
    total_qty: number;
    avg_price: number;
    unique_buyers: bigint;
  }>>(
    `SELECT
      ri.name as item_name,
      r."merchantName" as merchant_name,
      r.category,
      SUM(ri.quantity) as total_qty,
      AVG(ri."unitPrice") as avg_price,
      COUNT(DISTINCT r."userId") as unique_buyers
    FROM "ReceiptItem" ri
    JOIN "Receipt" r ON r.id = ri."receiptId"
    WHERE r."purchasedAt" >= $1
      AND r."purchasedAt" <= $2
      ${filters.category ? `AND r.category = $3` : ''}
    GROUP BY ri.name, r."merchantName", r.category
    HAVING COUNT(DISTINCT r."userId") >= ${MIN_K_ANONYMITY}
    ORDER BY total_qty DESC
    LIMIT ${limit}`,
    filters.startDate,
    filters.endDate,
    ...(filters.category ? [filters.category] : [])
  );

  return results.map(row => ({
    itemName: row.item_name,
    merchantName: row.merchant_name,
    category: row.category || 'Uncategorized',
    totalQuantity: Number(row.total_qty),
    averagePrice: Number(row.avg_price),
    uniqueBuyers: Number(row.unique_buyers),
  }));
}
