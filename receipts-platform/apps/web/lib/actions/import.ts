"use server";

import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { getImportConnector, listImportConnectors } from "@/lib/connectors/import";

export async function importOrderHistory(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const file = formData.get("file") as File;
  const provider = formData.get("provider") as string;

  if (!file || file.size === 0) {
    return { error: "Please select a file to import." };
  }

  if (!provider) {
    return { error: "Please select a provider." };
  }

  const connector = getImportConnector(provider);
  const content = await file.text();
  const orders = await connector.parseFile(content, file.name);

  if (orders.length === 0) {
    return { error: "No orders found in the file. Check that the format matches the expected export." };
  }

  let imported = 0;
  let skipped = 0;

  for (const order of orders) {
    const normalized = connector.normalizeOrder(order);

    const exists = await db.receipt.findFirst({
      where: {
        userId: session.user.id,
        merchantCanonicalName: normalized.merchant.canonicalName,
        purchasedAt: new Date(normalized.purchase.purchasedAt),
        total: normalized.purchase.total,
      },
    });

    if (exists) {
      skipped++;
      continue;
    }

    await db.receipt.create({
      data: {
        userId: session.user.id,
        source: "MANUAL",
        merchantRawName: normalized.merchant.rawName,
        merchantCanonicalName: normalized.merchant.canonicalName,
        merchantCategory: normalized.merchant.category,
        merchantLocation: normalized.merchant.location,
        purchasedAt: new Date(normalized.purchase.purchasedAt),
        currency: normalized.purchase.currency,
        subtotal: normalized.purchase.subtotal,
        tax: normalized.purchase.tax,
        tip: normalized.purchase.tip,
        discount: normalized.purchase.discount,
        fees: normalized.purchase.fees,
        total: normalized.purchase.total,
        paymentMethod: normalized.payment.method,
        cardLast4: normalized.payment.cardLast4,
        walletType: normalized.payment.walletType,
        confidence: normalized.metadata.confidence,
        requiresReview: normalized.metadata.requiresReview,
        items: {
          create: normalized.items.map((item) => ({
            rawName: item.rawName,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            category: item.category,
          })),
        },
      },
    });

    imported++;
  }

  return { imported, skipped, total: orders.length };
}

export async function getImportProviders() {
  return listImportConnectors().map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    instructions: c.instructions,
    formats: c.supportedFormats,
  }));
}
