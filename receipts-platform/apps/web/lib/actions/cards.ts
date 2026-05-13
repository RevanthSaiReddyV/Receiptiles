"use server";

import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { revalidatePath } from "next/cache";

export async function addCard(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const last4 = formData.get("last4") as string;
  const network = formData.get("network") as string;

  if (!name || !last4 || last4.length !== 4) {
    throw new Error("Invalid card details.");
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

export async function deleteCard(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const cardId = formData.get("cardId") as string;
  await db.cardRewardRule.deleteMany({ where: { cardId } });
  await db.userCard.deleteMany({ where: { id: cardId, userId: session.user.id } });
  revalidatePath("/cards");
}

export async function deleteRewardRule(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const ruleId = formData.get("ruleId") as string;
  const rule = await db.cardRewardRule.findUnique({ where: { id: ruleId }, include: { card: true } });
  if (!rule || rule.card.userId !== session.user.id) throw new Error("Not found");
  await db.cardRewardRule.delete({ where: { id: ruleId } });
  revalidatePath("/cards");
}

export async function addCardWithPreset(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const last4 = formData.get("last4") as string;
  const network = formData.get("network") as string;
  const preset = formData.get("preset") as string;

  const card = await db.userCard.create({
    data: { userId: session.user.id, name, last4, network },
  });

  const presetRules = CARD_PRESETS[preset];
  if (presetRules) {
    await db.cardRewardRule.createMany({
      data: presetRules.map((r) => ({ cardId: card.id, ...r })),
    });
  }

  revalidatePath("/cards");
}

const CARD_PRESETS: Record<string, Array<{ category: string | null; merchantName: string | null; rewardRate: number; rewardType: string; multiplier: number }>> = {
  "chase-sapphire-preferred": [
    { category: "Dining", merchantName: null, rewardRate: 3, rewardType: "points", multiplier: 1 },
    { category: "Transportation", merchantName: null, rewardRate: 2, rewardType: "points", multiplier: 1 },
    { category: "Travel", merchantName: null, rewardRate: 2, rewardType: "points", multiplier: 1 },
    { category: null, merchantName: null, rewardRate: 1, rewardType: "points", multiplier: 1 },
  ],
  "chase-sapphire-reserve": [
    { category: "Dining", merchantName: null, rewardRate: 3, rewardType: "points", multiplier: 1 },
    { category: "Transportation", merchantName: null, rewardRate: 3, rewardType: "points", multiplier: 1 },
    { category: "Travel", merchantName: null, rewardRate: 3, rewardType: "points", multiplier: 1 },
    { category: null, merchantName: null, rewardRate: 1, rewardType: "points", multiplier: 1 },
  ],
  "amex-gold": [
    { category: "Dining", merchantName: null, rewardRate: 4, rewardType: "points", multiplier: 1 },
    { category: "Groceries", merchantName: null, rewardRate: 4, rewardType: "points", multiplier: 1 },
    { category: null, merchantName: null, rewardRate: 1, rewardType: "points", multiplier: 1 },
  ],
  "amex-platinum": [
    { category: "Travel", merchantName: null, rewardRate: 5, rewardType: "points", multiplier: 1 },
    { category: null, merchantName: null, rewardRate: 1, rewardType: "points", multiplier: 1 },
  ],
  "citi-double-cash": [
    { category: null, merchantName: null, rewardRate: 2, rewardType: "cashback", multiplier: 1 },
  ],
  "discover-it": [
    { category: null, merchantName: null, rewardRate: 1, rewardType: "cashback", multiplier: 1 },
  ],
  "capital-one-savor": [
    { category: "Dining", merchantName: null, rewardRate: 4, rewardType: "cashback", multiplier: 1 },
    { category: "Entertainment", merchantName: null, rewardRate: 4, rewardType: "cashback", multiplier: 1 },
    { category: "Groceries", merchantName: null, rewardRate: 3, rewardType: "cashback", multiplier: 1 },
    { category: null, merchantName: null, rewardRate: 1, rewardType: "cashback", multiplier: 1 },
  ],
  "chase-freedom-unlimited": [
    { category: "Dining", merchantName: null, rewardRate: 3, rewardType: "cashback", multiplier: 1 },
    { category: null, merchantName: null, rewardRate: 1.5, rewardType: "cashback", multiplier: 1 },
  ],
  custom: [],
};

export async function addRewardRule(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const cardId = formData.get("cardId") as string;
  const category = (formData.get("category") as string) || null;
  const rewardRate = parseFloat(formData.get("rewardRate") as string);
  const rewardType = formData.get("rewardType") as string;

  if (!cardId || isNaN(rewardRate)) {
    throw new Error("Invalid reward rule.");
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
