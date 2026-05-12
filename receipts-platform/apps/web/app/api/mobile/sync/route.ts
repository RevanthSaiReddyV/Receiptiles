import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { syncAllSources } from "@/lib/sync";

export async function POST() {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncAllSources(userId);

  return NextResponse.json({
    imported: result.email + result.pos + result.customer,
    breakdown: {
      email: result.email,
      pos: result.pos,
      customer: result.customer,
    },
    errors: result.errors,
  });
}
