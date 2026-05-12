import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/mobile-auth";
import { db } from "@receipts/db";
import { uploadFile } from "@/lib/storage";
import { processReceiptJob } from "@/lib/process-receipt";
import { waitUntil } from "@vercel/functions";

export async function POST(request: NextRequest) {
  const userId = await authenticateRequest();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, and PDF files are supported." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `receipts/${userId}/${Date.now()}-${file.name}`;
  const fileUrl = await uploadFile(buffer, key, file.type);

  const job = await db.ingestionJob.create({
    data: {
      userId,
      source: "UPLOAD",
      status: "PENDING",
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
    },
  });

  const fileBase64 = buffer.toString("base64");

  waitUntil(
    processReceiptJob({
      jobId: job.id,
      userId,
      fileUrl,
      fileBase64,
    })
  );

  return NextResponse.json({ jobId: job.id, status: "processing" });
}
