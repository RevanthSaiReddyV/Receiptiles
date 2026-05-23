import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  const { page } = await req.json();
  if (!page || typeof page !== "string") {
    return NextResponse.json({ error: "page required" }, { status: 400 });
  }

  const key = `views:${page}`;
  const count = await redis.incr(key);

  const today = new Date().toISOString().slice(0, 10);
  const dailyKey = `views:${page}:${today}`;
  await redis.incr(dailyKey);

  return NextResponse.json({ page, total: count });
}

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get("page");
  if (!page) {
    return NextResponse.json({ error: "page param required" }, { status: 400 });
  }

  const key = `views:${page}`;
  const total = (await redis.get<number>(key)) || 0;

  const today = new Date().toISOString().slice(0, 10);
  const dailyKey = `views:${page}:${today}`;
  const todayCount = (await redis.get<number>(dailyKey)) || 0;

  return NextResponse.json({ page, total, today: todayCount });
}
