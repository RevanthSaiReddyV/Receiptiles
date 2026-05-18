import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { sendWaitlistConfirmationEmail } from "@/lib/email/waitlist-confirmation";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 5;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { email, source, website } = body;

    // Honeypot: if `website` field is filled, it's a bot
    if (website) {
      return NextResponse.json({ success: true, id: "fake", remaining: 74 });
    }

    if (!email || !email.includes("@") || email.length > 254) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    // Check if already exists to avoid re-sending confirmation
    const existing = await db.waitlistEntry.findUnique({
      where: { email: normalized },
    });

    const entry = await db.waitlistEntry.upsert({
      where: { email: normalized },
      update: {},
      create: {
        email: normalized,
        source: source || "landing",
      },
    });

    const count = await db.waitlistEntry.count();
    const remaining = Math.max(0, 100 - count);

    // Send confirmation email only for new signups
    if (!existing) {
      sendWaitlistConfirmationEmail(normalized, remaining).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      id: entry.id,
      remaining,
    });
  } catch {
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }
}

export async function GET() {
  const count = await db.waitlistEntry.count();
  return NextResponse.json({ remaining: Math.max(0, 100 - count), total: count });
}
