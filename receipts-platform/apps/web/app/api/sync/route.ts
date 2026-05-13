import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { scanEmailsForReceipts } from "@/lib/email/scanner";

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
