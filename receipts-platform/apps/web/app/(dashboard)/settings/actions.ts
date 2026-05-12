"use server";

import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { revalidatePath } from "next/cache";

export async function disconnectSource(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const id = formData.get("id") as string;
  const type = formData.get("type") as string;

  if (type === "email") {
    await db.emailConnection.updateMany({
      where: { id, userId: session.user.id },
      data: { isActive: false },
    });
  } else if (type === "merchant") {
    await db.merchantConnection.deleteMany({
      where: { id, userId: session.user.id },
    });
  } else if (type === "customer") {
    await db.customerConnection.deleteMany({
      where: { id, userId: session.user.id },
    });
  }

  revalidatePath("/settings");
}
