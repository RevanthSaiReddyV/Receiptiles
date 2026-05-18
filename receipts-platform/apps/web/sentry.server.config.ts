import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";

if (dsn) {
  Sentry.init({
    dsn,
    environment,

    // Performance monitoring — slightly higher rate server-side
    tracesSampleRate: environment === "production" ? 0.2 : 1.0,
  });
}
