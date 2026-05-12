import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";

/**
 * POST /api/device/heartbeat
 * Device sends periodic heartbeat to confirm it's online.
 * Auth: Bearer dk_<key>
 * Body: { firmware?, freeHeap?, uptimeSeconds?, queueDepth? }
 */
export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  await db.device.update({
    where: { id: device.id },
    data: {
      lastSeenAt: new Date(),
      status: "ACTIVE",
      firmware: body.firmware ?? device.firmware,
      metadata: {
        ...(device.metadata as object ?? {}),
        lastHeartbeat: {
          freeHeap: body.freeHeap,
          uptimeSeconds: body.uptimeSeconds,
          queueDepth: body.queueDepth,
          timestamp: new Date().toISOString(),
        },
      },
    },
  });

  return NextResponse.json({
    status: "ok",
    serverTime: new Date().toISOString(),
    // Can push config updates to device here
    config: {
      syncInterval: 30, // seconds between receipt uploads
      maxBatchSize: 10,
    },
  });
}

async function authenticateDevice(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer dk_")) return null;

  const apiKey = authHeader.slice(7);
  const device = await db.device.findUnique({ where: { apiKey } });
  return device;
}
