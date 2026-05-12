import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";

/**
 * DELETE /api/mobile/cards/:id
 * Remove a card.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const card = await db.userCard.findFirst({
    where: { id, userId },
  });

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  await db.userCard.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
