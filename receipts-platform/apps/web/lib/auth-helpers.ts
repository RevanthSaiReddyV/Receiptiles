import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

export async function getAuthUser(request?: NextRequest) {
  // Try session auth first (web)
  const session = await auth();
  if (session?.user?.id) {
    return { id: session.user.id, email: session.user.email };
  }

  // Try bearer token auth (mobile)
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const user = await db.user.findFirst({
        where: { pushToken: token },
        select: { id: true, email: true },
      });
      if (user) return user;
    }
  }

  return null;
}
