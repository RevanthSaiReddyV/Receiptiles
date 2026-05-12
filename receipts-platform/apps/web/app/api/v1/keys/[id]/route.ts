import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Session required." } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const key = await db.apiKey.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!key) {
    return NextResponse.json(
      { error: { code: "not_found", message: "API key not found." } },
      { status: 404 }
    );
  }

  await db.apiKey.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ data: { id, revoked: true } });
}
