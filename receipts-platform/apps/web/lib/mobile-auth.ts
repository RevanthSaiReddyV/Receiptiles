import { headers } from "next/headers";
import { jwtVerify } from "jose";
import { auth } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret"
);

/**
 * Authenticate a request — supports both NextAuth sessions (web) and
 * Bearer JWT tokens (mobile).
 */
export async function authenticateRequest(): Promise<string | null> {
  // First try NextAuth session (works for web + SSR)
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  // Fall back to Bearer token (mobile)
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}
