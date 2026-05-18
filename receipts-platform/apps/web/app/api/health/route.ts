import { NextResponse } from "next/server";
import { db } from "@receipts/db";

const startTime = Date.now();

export async function GET() {
  const timestamp = new Date().toISOString();
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  const version = "0.0.1";
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Check database connectivity with timeout
  let databaseStatus: "ok" | "down" = "down";
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database timeout")), 3000)
      ),
    ]);
    databaseStatus = "ok";
  } catch {
    databaseStatus = "down";
  }

  // Check external dependency configuration (env vars present)
  const emailStatus = process.env.RESEND_API_KEY ? "ok" : "unconfigured";
  const storageStatus =
    process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
      ? "ok"
      : "unconfigured";

  // Overall status
  const status: "ok" | "degraded" | "down" =
    databaseStatus === "down"
      ? "down"
      : emailStatus === "unconfigured" || storageStatus === "unconfigured"
        ? "degraded"
        : "ok";

  const body = {
    status,
    timestamp,
    version,
    environment,
    uptime,
    checks: {
      database: { status: databaseStatus },
      email: { status: emailStatus },
      storage: { status: storageStatus },
    },
  };

  return NextResponse.json(body, {
    status: status === "down" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
