"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
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
    redirectTo: "/dashboard",
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
  } catch {
    redirect("/login?error=Invalid+email+or+password.");
  }
}
