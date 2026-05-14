import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { db } from "@receipts/db";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { retailer } = body as { retailer?: string };

  if (retailer) {
    const connection = await db.retailerConnection.findFirst({
      where: { userId: user.id, retailer, isActive: true },
    });

    if (!connection) {
      return NextResponse.json({ error: `No active connection for ${retailer}` }, { status: 404 });
    }

    return NextResponse.json({
      status: "syncing",
      retailer,
      message: `Syncing ${retailer}...`,
    });
  }

  return NextResponse.json({
    status: "syncing",
    message: "Syncing all connected retailers...",
  });
}
