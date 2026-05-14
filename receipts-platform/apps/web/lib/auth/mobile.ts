import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

export async function authenticateRequest(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  return null;
}
