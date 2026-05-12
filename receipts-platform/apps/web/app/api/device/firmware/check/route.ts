import { NextRequest, NextResponse } from 'next/server';
import { db } from '@receipts/db';

/**
 * GET /api/device/firmware/check?current=1.0.0
 *
 * Device firmware update check endpoint.
 * Returns available update info if a newer version exists.
 */

// Current latest firmware version (update this when publishing new firmware)
const LATEST_FIRMWARE = {
  version: '1.0.0',
  downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://receipts.app'}/firmware/receipts-esp32-v1.0.0.bin`,
  sha256: '', // Populated during build
  size: 0,
  forceUpdate: false,
  minVersion: '0.0.1', // Minimum version that can OTA (older must flash manually)
};

async function authenticateDevice(request: NextRequest) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer dk_')) return null;

  const apiKey = auth.replace('Bearer ', '');
  const device = await db.device.findUnique({ where: { apiKey } });

  if (!device || device.status === 'INACTIVE') return null;
  return device;
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a !== b) return a - b;
  }
  return 0;
}

export async function GET(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentVersion = request.nextUrl.searchParams.get('current') || '0.0.0';

  // Update device's known firmware version
  await db.device.update({
    where: { id: device.id },
    data: {
      metadata: {
        ...(device.metadata as Record<string, unknown> || {}),
        firmwareVersion: currentVersion,
        lastUpdateCheck: new Date().toISOString(),
      },
    },
  });

  // Check if update is available
  const updateAvailable = compareVersions(LATEST_FIRMWARE.version, currentVersion) > 0;

  if (!updateAvailable) {
    return NextResponse.json({
      updateAvailable: false,
      currentVersion,
      latestVersion: LATEST_FIRMWARE.version,
    });
  }

  // Check if device meets minimum version for OTA
  if (compareVersions(currentVersion, LATEST_FIRMWARE.minVersion) < 0) {
    return NextResponse.json({
      updateAvailable: true,
      requiresManualFlash: true,
      version: LATEST_FIRMWARE.version,
      message: `Version ${currentVersion} is too old for OTA. Please flash manually.`,
    });
  }

  return NextResponse.json({
    updateAvailable: true,
    version: LATEST_FIRMWARE.version,
    downloadUrl: LATEST_FIRMWARE.downloadUrl,
    sha256: LATEST_FIRMWARE.sha256,
    size: LATEST_FIRMWARE.size,
    forceUpdate: LATEST_FIRMWARE.forceUpdate,
  });
}
