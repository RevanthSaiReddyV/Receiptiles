import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";

/**
 * GET /api/mobile/connections
 * Returns all active connections (email, POS, customer) for the user.
 */
export async function GET() {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [emailConnections, merchantConnections, customerConnections] =
    await Promise.all([
      db.emailConnection.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          provider: true,
          email: true,
          lastSyncAt: true,
          createdAt: true,
        },
      }),
      db.merchantConnection.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          provider: true,
          merchantName: true,
          merchantId: true,
          lastSyncAt: true,
          createdAt: true,
        },
      }),
      db.customerConnection.findMany({
        where: { userId, isActive: true },
        select: {
          id: true,
          provider: true,
          email: true,
          lastSyncAt: true,
          createdAt: true,
        },
      }),
    ]);

  return NextResponse.json({
    email: emailConnections,
    pos: merchantConnections,
    customer: customerConnections,
  });
}

/**
 * DELETE /api/mobile/connections
 * Disconnect a connection. Body: { type: "email"|"pos"|"customer", id: string }
 */
export async function DELETE(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, id } = await request.json();

  if (!type || !id) {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 }
    );
  }

  try {
    if (type === "email") {
      await db.emailConnection.updateMany({
        where: { id, userId },
        data: { isActive: false },
      });
    } else if (type === "pos") {
      await db.merchantConnection.updateMany({
        where: { id, userId },
        data: { isActive: false },
      });
    } else if (type === "customer") {
      await db.customerConnection.updateMany({
        where: { id, userId },
        data: { isActive: false },
      });
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be email, pos, or customer." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
