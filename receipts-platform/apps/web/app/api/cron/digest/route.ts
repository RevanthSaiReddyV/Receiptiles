import { NextResponse } from "next/server";
import { db } from "@receipts/db";
import { sendDigestEmail } from "@/lib/email/send";
import type { z } from "zod";
import type { canonicalReceiptSchema } from "@receipts/shared";

export const runtime = "nodejs";
export const maxDuration = 300;

type Receipt = z.infer<typeof canonicalReceiptSchema>;

function dbReceiptToCanonical(r: {
  merchantRawName: string;
  merchantCanonicalName: string;
  merchantCategory: string;
  merchantLocation: string | null;
  purchasedAt: Date;
  currency: string;
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  fees: number;
  total: number;
  paymentMethod: string;
  cardId: string | null;
  cardLast4: string | null;
  walletType: string | null;
  entryMode: string | null;
  confidence: number;
  requiresReview: boolean;
  source: string;
  items: Array<{
    rawName: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category: string;
  }>;
}): Receipt {
  return {
    merchant: {
      rawName: r.merchantRawName,
      canonicalName: r.merchantCanonicalName,
      category: r.merchantCategory,
      location: r.merchantLocation,
    },
    purchase: {
      purchasedAt: r.purchasedAt.toISOString(),
      currency: r.currency,
      subtotal: r.subtotal,
      tax: r.tax,
      tip: r.tip,
      discount: r.discount,
      fees: r.fees,
      total: r.total,
    },
    payment: {
      method: r.paymentMethod,
      cardId: r.cardId,
      cardLast4: r.cardLast4,
      walletType: r.walletType,
      entryMode: r.entryMode,
    },
    items: r.items,
    metadata: {
      confidence: r.confidence,
      requiresReview: r.requiresReview,
    },
    source: r.source as Receipt["source"],
  };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const dayOfWeek = now.getUTCDay();

  // Daily digest: last 24h. Weekly digest: every Sunday covers last 7 days.
  const isWeekly = dayOfWeek === 0;
  const lookbackMs = isWeekly ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const periodStart = new Date(now.getTime() - lookbackMs);

  const users = await db.user.findMany({
    where: {
      receipts: {
        some: { purchasedAt: { gte: periodStart } },
      },
    },
    select: { id: true, email: true },
  });

  let sent = 0;
  for (const user of users) {
    const receipts = await db.receipt.findMany({
      where: {
        userId: user.id,
        purchasedAt: { gte: periodStart },
      },
      include: { items: true },
      orderBy: { purchasedAt: "desc" },
    });

    if (receipts.length === 0) continue;

    try {
      await sendDigestEmail(
        user.email,
        receipts.map(dbReceiptToCanonical),
        { start: periodStart.toISOString(), end: now.toISOString() }
      );
      sent++;
    } catch (e) {
      console.error(`[digest] Failed to send to ${user.email}:`, (e as Error).message);
    }
  }

  return NextResponse.json({
    type: isWeekly ? "weekly" : "daily",
    usersProcessed: users.length,
    emailsSent: sent,
  });
}
