import { z } from "zod";

export const merchantSchema = z.object({
  rawName: z.string().min(1),
  canonicalName: z.string().min(1),
  category: z.string().default("Uncategorized"),
  location: z.string().nullable().default(null),
});

export const purchaseDetailsSchema = z.object({
  purchasedAt: z.string().datetime(),
  currency: z.string().length(3).default("USD"),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  tip: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  fees: z.number().min(0).default(0),
  total: z.number().min(0),
});

export const paymentDetailsSchema = z.object({
  method: z.string().default("unknown"),
  cardId: z.string().nullable().default(null),
  cardLast4: z.string().nullable().default(null),
  walletType: z.string().nullable().default(null),
  entryMode: z.string().nullable().default(null),
});

export const receiptItemSchema = z.object({
  rawName: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().min(0).default(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  category: z.string().default("Uncategorized"),
});

export const receiptMetadataSchema = z.object({
  confidence: z.number().min(0).max(1),
  requiresReview: z.boolean().default(false),
  ocrText: z.string().optional(),
  rawParseResult: z.unknown().optional(),
});

export const receiptSourceSchema = z.enum([
  "upload",
  "email",
  "pos",
  "processor",
  "manual",
]);

export const canonicalReceiptSchema = z.object({
  merchant: merchantSchema,
  purchase: purchaseDetailsSchema,
  payment: paymentDetailsSchema,
  items: z.array(receiptItemSchema),
  metadata: receiptMetadataSchema,
  source: receiptSourceSchema,
});

export const createReceiptSchema = canonicalReceiptSchema;

export const uploadReceiptSchema = z.object({
  file: z.any(),
});

export const cardRewardRuleSchema = z.object({
  category: z.string().nullable().default(null),
  merchantName: z.string().nullable().default(null),
  rewardRate: z.number().min(0),
  rewardType: z.enum(["cashback", "points", "miles"]),
  multiplier: z.number().min(0).default(1),
});

export const userCardSchema = z.object({
  name: z.string().min(1),
  last4: z.string().length(4),
  network: z.enum(["visa", "mastercard", "amex", "discover", "other"]),
  issuer: z.string().nullable().default(null),
  isDefault: z.boolean().default(false),
});
