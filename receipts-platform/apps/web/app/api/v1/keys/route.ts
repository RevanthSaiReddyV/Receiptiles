import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import crypto from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Session required." } },
      { status: 401 }
    );
  }

  const keys = await db.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      isActive: true,
      rateLimit: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: keys });
}

/**
 * POST /api/v1/keys
 * Create a new API key. Body: { name, expiresInDays?, rateLimit? }
 * Returns the full key ONCE — it cannot be retrieved again.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Session required." } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const name = body.name?.trim();

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Name is required (min 2 chars)." } },
      { status: 400 }
    );
  }

  // Generate a secure API key: sk_live_<32 random hex chars>
  const randomPart = crypto.randomBytes(24).toString("hex");
  const key = `sk_live_${randomPart}`;
  const prefix = key.slice(0, 12); // "sk_live_xxxx" for display

  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + body.expiresInDays * 86_400_000)
    : null;

  const rateLimit = Math.min(Math.max(body.rateLimit || 100, 10), 1000);

  const apiKey = await db.apiKey.create({
    data: {
      userId: session.user.id,
      name,
      key,
      prefix,
      rateLimit,
      expiresAt,
    },
  });

  return NextResponse.json(
    {
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key, // Full key — shown only once
        prefix: apiKey.prefix,
        rateLimit: apiKey.rateLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
    },
    { status: 201 }
  );
}
