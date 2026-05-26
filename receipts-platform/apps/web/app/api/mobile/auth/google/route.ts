import { NextRequest, NextResponse } from "next/server";
import { db } from "@receipts/db";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "fallback-secret"
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ error: "ID token required" }, { status: 400 });
  }

  try {
    // Verify Google ID token
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!googleRes.ok) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
    }

    const googleUser = await googleRes.json();

    // Verify audience matches our client ID
    if (googleUser.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: "Token audience mismatch" }, { status: 401 });
    }

    const email = googleUser.email;
    const name = googleUser.name || googleUser.email.split("@")[0];
    const googleId = googleUser.sub;

    // Find or create user
    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name,
          emailVerified: new Date(),
        },
      });
    } else if (!user.emailVerified) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
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
    console.error("Google auth error:", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
