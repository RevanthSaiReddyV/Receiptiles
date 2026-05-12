import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import crypto from "crypto";

/**
 * POST /api/device/register
 * Register a new ESP32 device. Called during device provisioning.
 * Body: { serial, posType?, connectionType?, firmware? }
 * Returns: { deviceId, apiKey } — apiKey must be stored in device flash
 */
export async function POST(request: NextRequest) {
  // This endpoint requires a provisioning key (separate from device keys)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provisionKey = authHeader.slice(7);
  if (provisionKey !== process.env.DEVICE_PROVISION_KEY) {
    return NextResponse.json({ error: "Invalid provisioning key" }, { status: 403 });
  }

  const body = await request.json();
  const { serial, posType, connectionType, firmware } = body;

  if (!serial) {
    return NextResponse.json(
      { error: "serial is required" },
      { status: 400 }
    );
  }

  // Check if device already registered
  const existing = await db.device.findUnique({ where: { deviceSerial: serial } });
  if (existing) {
    return NextResponse.json(
      { error: "Device already registered", deviceId: existing.id },
      { status: 409 }
    );
  }

  // Generate device API key
  const apiKey = `dk_${crypto.randomBytes(32).toString("hex")}`;

  const device = await db.device.create({
    data: {
      deviceSerial: serial,
      posType: posType ?? null,
      connectionType: connectionType ?? null,
      firmware: firmware ?? null,
      apiKey,
      status: "PROVISIONING",
    },
  });

  return NextResponse.json(
    {
      deviceId: device.id,
      apiKey, // Only returned once during provisioning
      status: device.status,
    },
    { status: 201 }
  );
}
