import { NextResponse } from "next/server";

/**
 * Apple App Site Association (AASA) for Universal Links.
 * Tells iOS which URL paths should open in the native app.
 */
export async function GET() {
  const appId = `${process.env.APPLE_TEAM_ID ?? "TEAMID"}.com.receiptsplatform.app`;

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: appId,
            paths: [
              "/claim/*",
              "/receipt/*",
              "/wallet",
            ],
          },
        ],
      },
      webcredentials: {
        apps: [appId],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
