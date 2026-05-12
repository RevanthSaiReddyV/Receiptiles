import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";

export async function GET(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);
  const merchant = searchParams.get("merchant");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = { userId };
  if (merchant) where.merchantCanonicalName = { contains: merchant, mode: "insensitive" };
  if (category) where.merchantCategory = category;

  const receipts = await db.receipt.findMany({
    where,
    orderBy: { purchasedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { items: true },
  });

  const hasMore = receipts.length > limit;
  const data = hasMore ? receipts.slice(0, limit) : receipts;

  return NextResponse.json({
    receipts: data,
    nextCursor: hasMore ? data[data.length - 1].id : null,
  });
}
