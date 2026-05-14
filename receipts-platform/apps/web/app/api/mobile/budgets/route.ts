import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";

/**
 * GET /api/mobile/budgets
 * List user's budgets with current spending progress.
 */
export async function GET() {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get all budgets
  const budgets = await db.budget.findMany({
    where: { userId },
    orderBy: { category: "asc" },
  });

  // Get this month's spending by category
  const receipts = await db.receipt.findMany({
    where: {
      userId,
      purchasedAt: { gte: monthStart, lte: monthEnd },
    },
    select: { merchantCategory: true, total: true },
  });

  const spendingByCategory: Record<string, number> = {};
  for (const r of receipts) {
    spendingByCategory[r.merchantCategory] =
      (spendingByCategory[r.merchantCategory] || 0) + r.total;
  }

  // Total spending this month
  const totalSpent = receipts.reduce((sum, r) => sum + r.total, 0);
  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);

  // Enrich budgets with current spend
  const enrichedBudgets = budgets.map((budget) => {
    const spent = spendingByCategory[budget.category] || 0;
    const progress = budget.monthlyLimit > 0 ? spent / budget.monthlyLimit : 0;
    const remaining = Math.max(budget.monthlyLimit - spent, 0);
    const daysInMonth = monthEnd.getDate();
    const dayOfMonth = now.getDate();
    const dailyBudget = remaining / Math.max(daysInMonth - dayOfMonth, 1);

    return {
      ...budget,
      spent: Math.round(spent * 100) / 100,
      progress: Math.round(progress * 1000) / 1000,
      remaining: Math.round(remaining * 100) / 100,
      dailyBudget: Math.round(dailyBudget * 100) / 100,
      isOverBudget: spent > budget.monthlyLimit,
    };
  });

  return NextResponse.json({
    budgets: enrichedBudgets,
    summary: {
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalRemaining: Math.round(Math.max(totalBudget - totalSpent, 0) * 100) / 100,
      progress: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 1000 : 0,
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    },
  });
}

/**
 * POST /api/mobile/budgets
 * Create or update a budget.
 * Body: { category, monthlyLimit }
 */
export async function POST(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { category, monthlyLimit } = body;

  if (!category || monthlyLimit === undefined || monthlyLimit < 0) {
    return NextResponse.json(
      { error: "category and monthlyLimit (>= 0) are required" },
      { status: 400 }
    );
  }

  const budget = await db.budget.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, monthlyLimit },
    update: { monthlyLimit },
  });

  return NextResponse.json({ budget }, { status: 201 });
}

/**
 * DELETE /api/mobile/budgets
 * Delete a budget. Body: { category }
 */
export async function DELETE(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { category } = body;

  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  await db.budget.deleteMany({ where: { userId, category } });

  return NextResponse.json({ deleted: true });
}
