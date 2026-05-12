import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { processWebhookReceipt } from "@/lib/webhooks/process";

/**
 * POST /api/device/receipts
 * ESP32 device publishes parsed ESC/POS receipt data.
 * Auth: Bearer dk_<key>
 *
 * Body (single receipt):
 * {
 *   merchantName: string,
 *   merchantLocation?: string,
 *   items: [{ name, quantity, unitPrice, totalPrice }],
 *   subtotal: number,
 *   tax: number,
 *   tip?: number,
 *   total: number,
 *   currency?: string,
 *   paymentMethod?: string,
 *   cardLast4?: string,
 *   transactionId?: string,
 *   timestamp?: string (ISO),
 *   rawEscPos?: string (base64 encoded raw bytes)
 * }
 *
 * Body (batch):
 * { receipts: [...] }
 */
export async function POST(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Support single or batch
  const receipts = body.receipts ?? [body];

  if (!Array.isArray(receipts) || receipts.length === 0) {
    return NextResponse.json(
      { error: "At least one receipt is required" },
      { status: 400 }
    );
  }

  if (receipts.length > 50) {
    return NextResponse.json(
      { error: "Maximum 50 receipts per batch" },
      { status: 400 }
    );
  }

  // Update device last seen
  await db.device.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date(), status: "ACTIVE" },
  });

  const results: Array<{ index: number; receiptId: string | null; status: string }> = [];

  for (let i = 0; i < receipts.length; i++) {
    const r = receipts[i];

    if (!r.merchantName || r.total === undefined) {
      results.push({ index: i, receiptId: null, status: "invalid" });
      continue;
    }

    try {
      const receiptId = await processWebhookReceipt({
        provider: "device",
        externalId: r.transactionId ?? `${device.deviceSerial}_${Date.now()}_${i}`,
        merchantName: r.merchantName,
        merchantLocation: r.merchantLocation ?? device.locationId,
        items: (r.items ?? []).map((item: { name: string; quantity?: number; unitPrice?: number; totalPrice?: number; category?: string }) => ({
          name: item.name,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
          totalPrice: item.totalPrice ?? item.unitPrice ?? 0,
          category: item.category,
        })),
        subtotal: r.subtotal ?? r.total - (r.tax ?? 0) - (r.tip ?? 0),
        tax: r.tax ?? 0,
        tip: r.tip ?? 0,
        discount: r.discount ?? 0,
        total: r.total,
        currency: r.currency ?? "USD",
        paymentMethod: r.paymentMethod ?? "card",
        cardLast4: r.cardLast4,
        purchasedAt: r.timestamp ? new Date(r.timestamp) : new Date(),
        deviceId: device.id,
      });

      results.push({
        index: i,
        receiptId,
        status: receiptId ? "created" : "unmatched",
      });
    } catch (error) {
      results.push({
        index: i,
        receiptId: null,
        status: "error",
      });
      console.error(`Device receipt processing error [${device.deviceSerial}]:`, error);
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}

/**
 * GET /api/device/receipts
 * Device can query recent receipts it submitted (for NFC pass updates).
 * Returns last N receipts from this device.
 */
export async function GET(request: NextRequest) {
  const device = await authenticateDevice(request);
  if (!device) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);

  const events = await db.webhookEvent.findMany({
    where: {
      deviceId: device.id,
      status: "processed",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      receiptId: true,
      createdAt: true,
      eventType: true,
    },
  });

  return NextResponse.json({ events });
}

async function authenticateDevice(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer dk_")) return null;

  const apiKey = authHeader.slice(7);
  const device = await db.device.findUnique({ where: { apiKey } });
  return device;
}
