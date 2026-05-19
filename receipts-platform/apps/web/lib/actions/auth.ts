"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@receipts/db";
import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signup(formData: FormData): Promise<void> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/signup?error=Invalid+input.+Password+must+be+at+least+8+characters.");
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    redirect("/signup?error=An+account+with+this+email+already+exists.");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/wallet",
  });
}

export async function login(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=Email+and+password+are+required.");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "digest" in error) {
      const digest = (error as { digest: string }).digest;
      if (digest.startsWith("NEXT_REDIRECT")) throw error;
    }
    redirect("/login?error=Invalid+email+or+password.");
  }
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;

  if (!email) {
    redirect("/forgot-password?error=Please+enter+your+email.");
  }

  const user = await db.user.findUnique({ where: { email } });

  if (user) {
    // Invalidate existing tokens
    await db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    // Log the reset URL (in production, send via email service)
    console.log(`[Password Reset] ${email}: ${resetUrl}`);
  }

  // Always redirect with sent=1 to prevent email enumeration
  redirect("/forgot-password?sent=1");
}

export async function resetPassword(formData: FormData): Promise<void> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) {
    redirect("/reset-password?error=Invalid+reset+link.");
  }

  if (!password || password.length < 8) {
    redirect(`/reset-password?token=${token}&error=Password+must+be+at+least+8+characters.`);
  }

  if (password !== confirmPassword) {
    redirect(`/reset-password?token=${token}&error=Passwords+do+not+match.`);
  }

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    redirect("/reset-password?error=This+reset+link+has+expired+or+already+been+used.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  });

  await db.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  redirect("/login?reset=success");
}
