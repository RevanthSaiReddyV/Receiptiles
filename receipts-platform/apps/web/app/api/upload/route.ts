import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { uploadFile } from "@/lib/storage";
import { parseReceiptFromImage } from "@/lib/ocr";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `receipts/${session.user.id}/${Date.now()}-${file.name}`;

    // Upload to Vercel Blob
    const fileUrl = await uploadFile(buffer, key, file.type);

    // Create ingestion job
    const job = await db.ingestionJob.create({
      data: {
        userId: session.user.id,
        source: "UPLOAD",
        status: "PROCESSING",
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        startedAt: new Date(),
      },
    });

    // OCR with GPT-4o
    const fileBase64 = buffer.toString("base64");
    const parsed = await parseReceiptFromImage(fileBase64);

    // Save receipt
    const receipt = await db.receipt.create({
      data: {
        userId: session.user.id,
        source: "UPLOAD",
        fileUrl,
        merchantRawName: parsed.merchant.rawName,
        merchantCanonicalName: parsed.merchant.canonicalName,
        merchantCategory: parsed.merchant.category,
        merchantLocation: parsed.merchant.location,
        purchasedAt: new Date(parsed.purchase.purchasedAt),
        currency: parsed.purchase.currency,
        subtotal: parsed.purchase.subtotal,
        tax: parsed.purchase.tax,
        tip: parsed.purchase.tip,
        discount: parsed.purchase.discount,
        fees: parsed.purchase.fees,
        total: parsed.purchase.total,
        paymentMethod: parsed.payment.method,
        cardLast4: parsed.payment.cardLast4,
        walletType: parsed.payment.walletType,
        confidence: parsed.metadata.confidence,
        requiresReview: parsed.metadata.requiresReview,
        items: {
          create: parsed.items.map((item) => ({
            rawName: item.rawName,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            category: item.category,
          })),
        },
      },
    });

    await db.ingestionJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date(), receiptId: receipt.id },
    });

    return NextResponse.json({ receiptId: receipt.id });
  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Processing failed" },
      { status: 500 }
    );
  }
}
