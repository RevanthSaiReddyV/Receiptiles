import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";

/**
 * GET /api/mobile/cards
 * List user's payment cards.
 */
export async function GET() {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cards = await db.userCard.findMany({
    where: { userId },
    include: { rewardRules: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ cards });
}

/**
 * POST /api/mobile/cards
 * Add a new card. Body: { name, last4, network, issuer? }
 */
export async function POST(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, last4, network, issuer } = body;

  if (!name || !last4 || !network) {
    return NextResponse.json(
      { error: "name, last4, and network are required" },
      { status: 400 }
    );
  }

  const card = await db.userCard.create({
    data: {
      userId,
      name,
      last4,
      network,
      issuer: issuer || null,
    },
  });

  return NextResponse.json({ card }, { status: 201 });
}
