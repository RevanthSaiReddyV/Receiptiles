import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangePublicToken, syncTransactions } from "@/lib/connectors/plaid/sync";
import { db } from "@receipts/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { publicToken, institutionName } = await req.json();
  if (!publicToken) {
    return NextResponse.json({ error: "publicToken required" }, { status: 400 });
  }

  const { accessToken, itemId } = await exchangePublicToken(publicToken);

  // Store the connection
  await db.customerConnection.create({
    data: {
      userId: session.user.id,
      provider: "plaid",
      accountId: itemId,
      accessToken,
      metadata: { institutionName },
    },
  });

  // Initial sync
  const result = await syncTransactions(session.user.id, accessToken);

  return NextResponse.json({
    success: true,
    itemId,
    transactionsImported: result.purchases.length,
  });
}
