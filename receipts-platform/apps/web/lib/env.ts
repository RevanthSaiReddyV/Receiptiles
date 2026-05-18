import { z } from "zod";

/**
 * Server-side environment variables schema.
 * These are secrets and configuration that must never be exposed to the client.
 */
const serverSchema = z.object({
  // Node / Vercel
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  VERCEL_ENV: z
    .enum(["production", "preview", "development"])
    .optional(),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // Google Cloud (OCR) — optional, not all deploys use Cloud Vision
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_CREDENTIALS: z.string().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  // Gemini
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),

  // Resend
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM: z.string().default("receipts@updates.receiptsvault.com"),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
  R2_BUCKET_NAME: z.string().default("receipts"),
  R2_PUBLIC_URL: z.string().optional(),

  // Square
  SQUARE_APP_ID: z.string().min(1, "SQUARE_APP_ID is required"),
  SQUARE_APP_SECRET: z.string().min(1, "SQUARE_APP_SECRET is required"),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),

  // Shopify
  SHOPIFY_CLIENT_ID: z.string().optional(),
  SHOPIFY_CLIENT_SECRET: z.string().optional(),
  SHOPIFY_WEBHOOK_SECRET: z.string().optional(),
  SHOPIFY_STOREFRONT_ID: z.string().optional(),
  SHOPIFY_STOREFRONT_SECRET: z.string().optional(),

  // Clover
  CLOVER_APP_ID: z.string().optional(),
  CLOVER_APP_SECRET: z.string().optional(),

  // PayPal
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_SANDBOX: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  // Toast
  TOAST_WEBHOOK_SECRET: z.string().optional(),

  // Cron
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),

  // Device provisioning
  DEVICE_PROVISION_KEY: z.string().optional(),

  // Apple Wallet
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_PASS_TYPE_ID: z.string().default("pass.com.receipts.master"),

  // Google Wallet
  GOOGLE_WALLET_ISSUER_ID: z.string().optional(),
  GOOGLE_WALLET_SERVICE_ACCOUNT_KEY: z.string().optional(),

  // Android Universal Links
  ANDROID_SHA256_FINGERPRINT: z.string().optional(),

  // Optional observability
  SENTRY_DSN: z.string().url().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
});

/**
 * Client-side environment variables schema.
 * Only NEXT_PUBLIC_ prefixed variables are accessible on the client.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_VERCEL_URL: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateEnv() {
  const serverResult = serverSchema.safeParse(process.env);
  const clientResult = clientSchema.safeParse(process.env);

  if (!serverResult.success) {
    const formatted = serverResult.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `\n\n❌ Invalid server environment variables:\n${formatted}\n\n` +
        "Please check your .env.local file or Vercel environment settings.\n"
    );
  }

  if (!clientResult.success) {
    const formatted = clientResult.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `\n\n❌ Invalid client environment variables:\n${formatted}\n\n` +
        "Please check your .env.local file or Vercel environment settings.\n"
    );
  }

  return {
    ...serverResult.data,
    ...clientResult.data,
  };
}

/**
 * Typed, validated environment variables.
 * Throws a descriptive error at import time if any required variable is missing or invalid.
 *
 * @example
 * import { env } from "@/lib/env";
 * const db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
 */
export const env = validateEnv();

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
