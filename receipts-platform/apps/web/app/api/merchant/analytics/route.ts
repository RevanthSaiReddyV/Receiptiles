import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";

/**
 * GET /api/merchant/analytics
 * Merchant-facing analytics dashboard API
 * Authenticated via merchant API key (X-Merchant-Key header)
 */
export async function GET(req: NextRequest) {
  const merchantKey = req.headers.get("x-merchant-key");
  if (!merchantKey) {
    return NextResponse.json({ error: "Missing X-Merchant-Key header" }, { status: 401 });
  }

  // Validate merchant key
  const apiKey = await db.dataApiKey.findFirst({
    where: { key: merchantKey, active: true },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid merchant key" }, { status: 401 });
  }

  const merchantName = apiKey.partnerName;
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "30d";
  const metric = searchParams.get("metric") ?? "overview";

  // Calculate date range
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get receipts for this merchant
  const receipts = await db.receipt.findMany({
    where: {
      merchantCanonicalName: { contains: merchantName, mode: "insensitive" },
      purchasedAt: { gte: startDate },
    },
    include: { items: true },
    orderBy: { purchasedAt: "desc" },
  });

  if (metric === "overview") {
    const totalRevenue = receipts.reduce((sum, r) => sum + (r.total ?? 0), 0);
    const uniqueCustomers = new Set(receipts.map((r) => r.userId)).size;
    const avgOrderValue = receipts.length > 0 ? totalRevenue / receipts.length : 0;

    // Repeat customer rate
    const customerVisits = new Map<string, number>();
    receipts.forEach((r) => {
      customerVisits.set(r.userId, (customerVisits.get(r.userId) ?? 0) + 1);
    });
    const repeatCustomers = [...customerVisits.values()].filter((v) => v > 1).length;
    const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    // Revenue by day
    const revenueByDay = new Map<string, number>();
    receipts.forEach((r) => {
      const day = (r.purchasedAt ?? r.createdAt).toISOString().split("T")[0];
      revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + (r.total ?? 0));
    });

    return NextResponse.json({
      period,
      summary: {
        totalRevenue,
        transactionCount: receipts.length,
        uniqueCustomers,
        avgOrderValue,
        repeatRate,
        repeatCustomers,
      },
      revenueTimeline: [...revenueByDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, amount]) => ({ date, amount })),
    });
  }

  if (metric === "customers") {
    // Customer cohort analysis
    const customerData = new Map<string, { visits: number; totalSpent: number; firstVisit: Date; lastVisit: Date }>();
    receipts.forEach((r) => {
      const existing = customerData.get(r.userId);
      const date = r.purchasedAt ?? r.createdAt;
      if (existing) {
        existing.visits++;
        existing.totalSpent += r.total ?? 0;
        if (date < existing.firstVisit) existing.firstVisit = date;
        if (date > existing.lastVisit) existing.lastVisit = date;
      } else {
        customerData.set(r.userId, {
          visits: 1,
          totalSpent: r.total ?? 0,
          firstVisit: date,
          lastVisit: date,
        });
      }
    });

    const segments = {
      newCustomers: [...customerData.values()].filter((c) => c.visits === 1).length,
      returning: [...customerData.values()].filter((c) => c.visits >= 2 && c.visits < 5).length,
      loyal: [...customerData.values()].filter((c) => c.visits >= 5 && c.visits < 10).length,
      vip: [...customerData.values()].filter((c) => c.visits >= 10).length,
    };

    // Frequency distribution
    const frequencyBuckets = { "1x": 0, "2-3x": 0, "4-6x": 0, "7-10x": 0, "10+": 0 };
    customerData.forEach((c) => {
      if (c.visits === 1) frequencyBuckets["1x"]++;
      else if (c.visits <= 3) frequencyBuckets["2-3x"]++;
      else if (c.visits <= 6) frequencyBuckets["4-6x"]++;
      else if (c.visits <= 10) frequencyBuckets["7-10x"]++;
      else frequencyBuckets["10+"]++;
    });

    return NextResponse.json({
      period,
      totalCustomers: customerData.size,
      segments,
      frequencyDistribution: frequencyBuckets,
      avgLifetimeValue: customerData.size > 0
        ? [...customerData.values()].reduce((s, c) => s + c.totalSpent, 0) / customerData.size
        : 0,
    });
  }

  if (metric === "items") {
    // Top items analysis
    const itemStats = new Map<string, { name: string; quantity: number; revenue: number }>();
    receipts.forEach((r) => {
      r.items.forEach((item) => {
        const key = item.description?.toLowerCase() ?? "unknown";
        const existing = itemStats.get(key);
        if (existing) {
          existing.quantity += item.quantity ?? 1;
          existing.revenue += (item.unitPrice ?? 0) * (item.quantity ?? 1);
        } else {
          itemStats.set(key, {
            name: item.description ?? "Unknown",
            quantity: item.quantity ?? 1,
            revenue: (item.unitPrice ?? 0) * (item.quantity ?? 1),
          });
        }
      });
    });

    const topItems = [...itemStats.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    return NextResponse.json({
      period,
      topItems,
      totalUniqueItems: itemStats.size,
    });
  }

  if (metric === "timing") {
    // Peak hours and days analysis
    const hourCounts = Array(24).fill(0);
    const dayCounts = Array(7).fill(0);

    receipts.forEach((r) => {
      const date = r.purchasedAt ?? r.createdAt;
      hourCounts[date.getHours()]++;
      dayCounts[date.getDay()]++;
    });

    return NextResponse.json({
      period,
      peakHours: hourCounts.map((count, hour) => ({ hour, count })),
      peakDays: dayCounts.map((count, day) => ({
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day],
        count,
      })),
    });
  }

  return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
}
