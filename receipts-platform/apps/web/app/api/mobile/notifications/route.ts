import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const notifications: Notification[] = [];

  // 1. Subscription renewal reminders
  const upcomingSubscriptions = await db.subscription.findMany({
    where: {
      userId,
      status: "ACTIVE",
      nextExpectedAt: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // next 7 days
      },
    },
    take: 5,
  });

  for (const sub of upcomingSubscriptions) {
    notifications.push({
      id: `sub-renewal-${sub.id}`,
      type: "subscription_renewal",
      title: "Upcoming Subscription Renewal",
      message: `${sub.merchantName} (${sub.amount.toFixed(2)} ${sub.frequency.toLowerCase()}) renews ${sub.nextExpectedAt ? formatDate(sub.nextExpectedAt) : "soon"}`,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        subscriptionId: sub.id,
        merchantName: sub.merchantName,
        amount: sub.amount,
        renewalDate: sub.nextExpectedAt?.toISOString(),
      },
    });
  }

  // 2. Unusual spending alerts - check if recent spending exceeds normal patterns
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const recentSpending = await db.receipt.aggregate({
    where: {
      userId,
      purchasedAt: { gte: thirtyDaysAgo },
    },
    _sum: { total: true },
    _count: { id: true },
  });

  const previousSpending = await db.receipt.aggregate({
    where: {
      userId,
      purchasedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
    _sum: { total: true },
  });

  const recentTotal = recentSpending._sum.total ?? 0;
  const previousTotal = previousSpending._sum.total ?? 0;

  if (previousTotal > 0 && recentTotal > previousTotal * 1.3) {
    const percentIncrease = Math.round(
      ((recentTotal - previousTotal) / previousTotal) * 100
    );
    notifications.push({
      id: `spending-alert-${thirtyDaysAgo.toISOString().slice(0, 10)}`,
      type: "unusual_spending",
      title: "Spending Alert",
      message: `Your spending is up ${percentIncrease}% compared to last month ($${recentTotal.toFixed(2)} vs $${previousTotal.toFixed(2)})`,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        recentTotal,
        previousTotal,
        percentIncrease,
      },
    });
  }

  // 3. New receipts imported (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentReceipts = await db.receipt.count({
    where: {
      userId,
      createdAt: { gte: oneDayAgo },
    },
  });

  if (recentReceipts > 0) {
    notifications.push({
      id: `receipts-imported-${oneDayAgo.toISOString().slice(0, 10)}`,
      type: "receipt_imported",
      title: "New Receipts",
      message: `${recentReceipts} new receipt${recentReceipts > 1 ? "s" : ""} imported in the last 24 hours`,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        count: recentReceipts,
      },
    });
  }

  // 4. Reward milestone - check total receipts
  const totalReceipts = await db.receipt.count({ where: { userId } });
  const milestones = [10, 25, 50, 100, 250, 500, 1000];
  const reachedMilestone = milestones.find(
    (m) => totalReceipts >= m && totalReceipts < m + 5
  );

  if (reachedMilestone) {
    notifications.push({
      id: `milestone-${reachedMilestone}`,
      type: "reward_milestone",
      title: "Milestone Reached!",
      message: `You've tracked ${reachedMilestone}+ receipts. Keep going!`,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        milestone: reachedMilestone,
        totalReceipts,
      },
    });
  }

  // 5. Budget alerts
  const budgets = await db.budget.findMany({
    where: { userId, isActive: true },
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthStart = new Date(currentMonth + "-01");

  for (const budget of budgets) {
    const spending = await db.receipt.aggregate({
      where: {
        userId,
        merchantCategory: budget.category,
        purchasedAt: { gte: monthStart },
      },
      _sum: { total: true },
    });

    const spent = spending._sum.total ?? 0;
    const alertThreshold = budget.alertAt ?? 0.8;

    if (spent >= budget.monthlyLimit * alertThreshold) {
      const percentage = Math.round((spent / budget.monthlyLimit) * 100);
      notifications.push({
        id: `budget-alert-${budget.id}-${currentMonth}`,
        type: "budget_alert",
        title: "Budget Warning",
        message: `You've spent ${percentage}% of your ${budget.category} budget ($${spent.toFixed(2)} of $${budget.monthlyLimit.toFixed(2)})`,
        read: false,
        createdAt: new Date().toISOString(),
        metadata: {
          budgetId: budget.id,
          category: budget.category,
          spent,
          limit: budget.monthlyLimit,
          percentage,
        },
      });
    }
  }

  return NextResponse.json({
    notifications: notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { notificationId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { notificationId } = body;

  if (!notificationId) {
    return NextResponse.json(
      { error: "notificationId is required" },
      { status: 400 }
    );
  }

  // Since notifications are computed dynamically, we acknowledge the read
  // In a production system, you'd store read states in a table
  return NextResponse.json({
    success: true,
    notificationId,
    readAt: new Date().toISOString(),
  });
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays <= 7) return `in ${diffDays} days`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
