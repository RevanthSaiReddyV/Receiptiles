import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development";
const isDev = environment === "development";

// Only initialize Sentry if DSN is provided (skip in dev unless explicitly set)
if (dsn) {
  Sentry.init({
    dsn,
    environment,

    // Performance monitoring
    tracesSampleRate: isDev ? 1.0 : 0.1,

    // Session replay
    integrations: [
      Sentry.replayIntegration(),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
