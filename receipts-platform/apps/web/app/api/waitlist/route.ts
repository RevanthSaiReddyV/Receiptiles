import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";

export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const entry = await db.waitlistEntry.upsert({
      where: { email: email.toLowerCase().trim() },
      update: {},
      create: {
        email: email.toLowerCase().trim(),
        source: source || "landing",
      },
    });

    const count = await db.waitlistEntry.count();

    return NextResponse.json({
      success: true,
      id: entry.id,
      remaining: Math.max(0, 100 - count),
    });
  } catch {
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }
}

export async function GET() {
  const count = await db.waitlistEntry.count();
  return NextResponse.json({ remaining: Math.max(0, 100 - count), total: count });
}
