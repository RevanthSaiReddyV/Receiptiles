import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { SignJWT } from "jose";
import * as jose from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret"
);

export async function POST(request: NextRequest) {
  const { identityToken, fullName, email: appleEmail } = await request.json();

  if (!identityToken) {
    return NextResponse.json({ error: "Identity token required" }, { status: 400 });
  }

  try {
    // Decode Apple identity token (JWT) to get user info
    // In production, verify against Apple's public keys
    const decoded = jose.decodeJwt(identityToken);

    const appleUserId = decoded.sub as string;
    const email = (appleEmail || decoded.email) as string;

    if (!email && !appleUserId) {
      return NextResponse.json({ error: "Could not extract user info from Apple token" }, { status: 400 });
    }

    const name = fullName
      ? `${fullName.givenName || ""} ${fullName.familyName || ""}`.trim()
      : email?.split("@")[0] || "User";

    // Find or create user
    let user = email
      ? await db.user.findUnique({ where: { email } })
      : await db.user.findFirst({ where: { appleId: appleUserId } });

    if (!user) {
      if (!email) {
        return NextResponse.json({ error: "Email required for new accounts" }, { status: 400 });
      }
      user = await db.user.create({
        data: {
          email,
          name,
          appleId: appleUserId,
          emailVerified: new Date(),
        },
      });
    } else if (!user.appleId) {
      await db.user.update({
        where: { id: user.id },
        data: { appleId: appleUserId },
      });
    }

    // Generate JWT
    const token = await new SignJWT({ sub: user.id, email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Apple auth error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
