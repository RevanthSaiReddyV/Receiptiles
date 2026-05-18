import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
    });

    const data = await response.json();

    if (data.status === "down") {
      // Log error - Sentry will capture this when configured
      console.error(
        "[health-ping] Service is DOWN",
        JSON.stringify({
          timestamp: new Date().toISOString(),
          status: data.status,
          checks: data.checks,
        })
      );

      return NextResponse.json(
        { ok: false, status: data.status, checks: data.checks },
        { status: 503 }
      );
    }

    if (data.status === "degraded") {
      console.warn(
        "[health-ping] Service is DEGRADED",
        JSON.stringify({
          timestamp: new Date().toISOString(),
          status: data.status,
          checks: data.checks,
        })
      );
    }

    return NextResponse.json({
      ok: true,
      status: data.status,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "[health-ping] Failed to reach health endpoint",
      error instanceof Error ? error.message : String(error)
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Health endpoint unreachable",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
