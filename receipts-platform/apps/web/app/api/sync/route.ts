import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { scanEmailsForReceipts } from "@/lib/email/scanner";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const fullRescan = (body as Record<string, unknown>).fullRescan === true;

  if (fullRescan) {
    await db.emailConnection.updateMany({
      where: { userId: session.user.id },
      data: { lastSyncAt: null },
    });
  }

  try {
    const count = await scanEmailsForReceipts(session.user.id);
    return NextResponse.json({ imported: count });
  } catch (err) {
    console.error("[Sync API] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
