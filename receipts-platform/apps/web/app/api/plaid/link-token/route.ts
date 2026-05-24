import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createLinkToken } from "@/lib/connectors/plaid/sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const linkToken = await createLinkToken(session.user.id);
  return NextResponse.json({ linkToken });
}
