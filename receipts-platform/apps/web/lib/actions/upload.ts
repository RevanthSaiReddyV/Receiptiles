"use server";

import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { uploadFile } from "@/lib/storage";
import { processReceiptJob } from "@/lib/process-receipt";
import { redirect } from "next/navigation";
import { waitUntil } from "@vercel/functions";

export async function uploadReceipt(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  if (!file || file.size === 0) {
    throw new Error("Please select a file to upload.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and PDF files are supported.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `receipts/${session.user.id}/${Date.now()}-${file.name}`;
  const fileUrl = await uploadFile(buffer, key, file.type);

  const job = await db.ingestionJob.create({
    data: {
      userId: session.user.id,
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
      userId: session.user.id,
      fileUrl,
      fileBase64,
    })
  );

  redirect("/receipts");
}
