"use server";

import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { revalidatePath } from "next/cache";

export async function addCard(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const last4 = formData.get("last4") as string;
  const network = formData.get("network") as string;

  if (!name || !last4 || last4.length !== 4) {
    return { error: "Invalid card details." };
  }

  await db.userCard.create({
    data: {
      userId: session.user.id,
      name,
      last4,
      network,
    },
  });

  revalidatePath("/cards");
}

export async function addRewardRule(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const cardId = formData.get("cardId") as string;
  const category = (formData.get("category") as string) || null;
  const rewardRate = parseFloat(formData.get("rewardRate") as string);
  const rewardType = formData.get("rewardType") as string;

  if (!cardId || isNaN(rewardRate)) {
    return { error: "Invalid reward rule." };
  }

  const card = await db.userCard.findFirst({
    where: { id: cardId, userId: session.user.id },
  });
  if (!card) throw new Error("Card not found");

  await db.cardRewardRule.create({
    data: {
      cardId,
      category,
      rewardRate,
      rewardType,
      multiplier: 1,
    },
  });

  revalidatePath("/cards");
}
