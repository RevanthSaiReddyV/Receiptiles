import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

/**
 * POST /api/connectors/costco/connect
 *
 * Accepts Costco auth tokens from the user's browser session.
 * User logs into costco.com, then provides their session tokens.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { idToken, clientId } = body;

  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  // Validate the token by making a test API call
  try {
    const testRes = await fetch(
      "https://ecom-api.costco.com/ebusiness/order/v1/orders/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Costco-X-Authorization": `Bearer ${idToken}`,
          "Costco-X-Wcs-Clientid": clientId ?? "",
          "Client-Identifier": "481b1aec-aa3b-454b-b81b-48187e28f205",
        },
        body: JSON.stringify({
          query: `query { warehouseReceipts(startDate: "2025-01-01", endDate: "2025-01-02") { total } }`,
          variables: {},
        }),
      }
    );

    if (!testRes.ok) {
      const err = await testRes.text();
      console.error("[Costco] Token validation failed:", err);
      return NextResponse.json(
        { error: "Invalid Costco token. Please log in again at costco.com and try again." },
        { status: 400 }
      );
    }
  } catch (err) {
    console.error("[Costco] Token validation error:", err);
    return NextResponse.json(
      { error: "Could not verify Costco token" },
      { status: 502 }
    );
  }

  // Save the connection
  await db.retailerConnection.upsert({
    where: {
      userId_retailer: {
        userId: session.user.id,
        retailer: "costco",
      },
    },
    update: {
      authToken: idToken,
      clientId: clientId ?? null,
      isActive: true,
    },
    create: {
      userId: session.user.id,
      retailer: "costco",
      authToken: idToken,
      clientId: clientId ?? null,
    },
  });

  return NextResponse.json({ connected: true });
}
