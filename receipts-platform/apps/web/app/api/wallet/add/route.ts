import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import {
  getOrCreateWalletPass,
  generateMasterPassJson,
} from "@/lib/wallet/apple-pass";
import {
  getOrCreateGoogleWalletPass,
  generateGooglePassObject,
} from "@/lib/wallet/google-pass";
import { generateGoogleWalletLink } from "@/lib/wallet/google-wallet";

interface DeviceInfo {
  platform: string;
  deviceName?: string;
  deviceType?: string;
  osName?: string;
  osVersion?: string;
  browserName?: string;
  screenWidth?: number;
  screenHeight?: number;
  userAgent?: string;
  timezone?: string;
  language?: string;
}

function generateDeviceId(info: DeviceInfo, userId: string): string {
  const fingerprint = [
    userId,
    info.osName || "",
    info.deviceName || "",
    info.screenWidth || "",
    info.screenHeight || "",
    info.browserName || "",
    info.timezone || "",
  ].join("|");
  return crypto.createHash("sha256").update(fingerprint).digest("hex").slice(0, 16);
}

/**
 * GET /api/wallet/add
 * List user's wallet passes across all devices.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const passes = await db.walletPass.findMany({
    where: { userId: session.user.id, isActive: true },
    select: {
      id: true,
      platform: true,
      deviceName: true,
      deviceType: true,
      osName: true,
      browserName: true,
      createdAt: true,
      lastActiveAt: true,
      deviceId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    hasPass: passes.length > 0,
    count: passes.length,
    devices: passes,
  });
}

/**
 * POST /api/wallet/add
 * Create a wallet pass for this specific device.
 * Allows multiple passes per user (one per device).
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

  let body: DeviceInfo;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const platform = body.platform;
  if (platform !== "apple" && platform !== "google") {
    return NextResponse.json(
      { error: "Invalid platform. Must be 'apple' or 'google'." },
      { status: 400 }
    );
  }

  const deviceId = generateDeviceId(body, userId);

  // Check if this exact device already has a pass
  const existingDevicePass = await db.walletPass.findFirst({
    where: { userId, deviceId, platform, isActive: true },
  });

  if (platform === "apple") {
    const pass = existingDevicePass
      ? existingDevicePass
      : await getOrCreateWalletPass(userId);

    // Update with device info
    await db.walletPass.update({
      where: { id: pass.id },
      data: {
        isActive: true,
        deviceId,
        deviceName: body.deviceName || null,
        deviceType: body.deviceType || null,
        osName: body.osName || null,
        osVersion: body.osVersion || null,
        browserName: body.browserName || null,
        screenWidth: body.screenWidth || null,
        screenHeight: body.screenHeight || null,
        userAgent: body.userAgent?.slice(0, 500) || null,
        ipAddress: ip,
        lastActiveAt: new Date(),
      },
    });

    const passJson = await generateMasterPassJson(
      userId,
      pass.serialNumber,
      pass.authToken
    );

    const baseUrl = process.env.NEXTAUTH_URL || "https://receipts-platform.vercel.app";
    const passUrl = `${baseUrl}/api/wallet/apple/pass?serial=${pass.serialNumber}`;

    return NextResponse.json({
      success: true,
      passUrl,
      passData: passJson,
      deviceId,
      isNewDevice: !existingDevicePass,
    });
  }

  // Google Wallet
  const pass = existingDevicePass
    ? existingDevicePass
    : await getOrCreateGoogleWalletPass(userId);

  // Update with device info
  await db.walletPass.update({
    where: { id: pass.id },
    data: {
      isActive: true,
      deviceId,
      deviceName: body.deviceName || null,
      deviceType: body.deviceType || null,
      osName: body.osName || null,
      osVersion: body.osVersion || null,
      browserName: body.browserName || null,
      screenWidth: body.screenWidth || null,
      screenHeight: body.screenHeight || null,
      userAgent: body.userAgent?.slice(0, 500) || null,
      ipAddress: ip,
      lastActiveAt: new Date(),
    },
  });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, createdAt: true },
  });

  const receiptCount = await db.receipt.count({ where: { userId } });
  const treesSaved = receiptCount / 8333;
  const co2Saved = receiptCount * 0.0057;

  const passUrl = generateGoogleWalletLink({
    userId,
    userName: user?.name ?? session.user.name ?? "Member",
    receiptCount,
    treesSaved,
    co2Saved,
    memberSince: user?.createdAt
      ? user.createdAt.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : new Date().getFullYear().toString(),
  });

  const passObject = await generateGooglePassObject(userId, pass.serialNumber);

  return NextResponse.json({
    success: true,
    passUrl,
    passData: passObject,
    deviceId,
    isNewDevice: !existingDevicePass,
  });
}
