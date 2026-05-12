import { NextResponse } from "next/server";
import { db } from "@receipts/db";
import { syncAllSources } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usersWithConnections = await db.user.findMany({
    where: {
      OR: [
        { emailConnections: { some: { isActive: true } } },
        { merchantConnections: { some: { isActive: true } } },
        { customerConnections: { some: { isActive: true } } },
      ],
    },
    select: { id: true },
  });

  const results: Array<{ userId: string; result: unknown }> = [];

  for (const user of usersWithConnections) {
    try {
      const result = await syncAllSources(user.id);
      results.push({ userId: user.id, result });
    } catch (e) {
      results.push({ userId: user.id, result: { error: e instanceof Error ? e.message : "failed" } });
    }
  }

  return NextResponse.json({
    synced: results.length,
    results,
  });
}
