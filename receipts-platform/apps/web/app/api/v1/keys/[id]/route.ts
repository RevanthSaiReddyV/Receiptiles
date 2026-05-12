import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@receipts/db";

/**
 * DELETE /api/v1/keys/:id
 * Revoke (deactivate) an API key.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
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
