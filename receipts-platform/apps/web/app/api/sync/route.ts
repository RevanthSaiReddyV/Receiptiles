import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import { isReceiptEmail } from "@/lib/email/detector";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const debug = (body as Record<string, unknown>).debug === true;

  // Reset lastSyncAt for full rescan
  await db.emailConnection.updateMany({
    where: { userId: session.user.id },
    data: { lastSyncAt: null },
  });

  const connections = await db.emailConnection.findMany({
    where: { userId: session.user.id, isActive: true },
  });

  if (connections.length === 0) {
    return NextResponse.json({ error: "No email connections", imported: 0 });
  }

  const logs: string[] = [];
  let totalImported = 0;

  for (const connection of connections) {
    logs.push(`Connection: ${connection.email}`);

    // Check token
    let accessToken = connection.accessToken;
    if (connection.expiresAt && connection.expiresAt <= new Date()) {
      logs.push(`Token expired (${connection.expiresAt.toISOString()}), refreshing...`);
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: connection.refreshToken,
            grant_type: "refresh_token",
          }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          logs.push(`Token refresh FAILED (${res.status}): ${errBody}`);
          continue;
        }
        const data = await res.json();
        accessToken = data.access_token;
        await db.emailConnection.update({
          where: { id: connection.id },
          data: {
            accessToken: data.access_token,
            expiresAt: new Date(Date.now() + data.expires_in * 1000),
          },
        });
        logs.push(`Token refreshed OK`);
      } catch (err) {
        logs.push(`Token refresh exception: ${err}`);
        continue;
      }
    } else {
      logs.push(`Token valid until ${connection.expiresAt?.toISOString() ?? "unknown"}`);
    }

    // Search Gmail
    const since = new Date(Date.now() - 90 * 86400000);
    const afterTimestamp = Math.floor(since.getTime() / 1000);
    const query = `after:${afterTimestamp} (subject:receipt OR subject:"order confirmation" OR subject:"order confirmed" OR subject:invoice OR subject:"your trip" OR subject:"your ride" OR subject:"your order" OR subject:"your purchase" OR from:uber.com OR from:lyft.com OR from:amazon.com OR from:walmart.com OR from:instacart.com OR from:doordash.com OR from:grubhub.com OR from:target.com OR from:costco.com OR from:apple.com OR from:bestbuy.com OR from:starbucks.com OR from:etsy.com OR from:paypal.com)`;

    logs.push(`Query: ${query.substring(0, 150)}...`);

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({ q: query, maxResults: "50" })}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
      const errBody = await listRes.text();
      logs.push(`Gmail API FAILED (${listRes.status}): ${errBody}`);
      continue;
    }

    const listData = await listRes.json();
    const messages: Array<{ id: string }> = listData.messages ?? [];
    logs.push(`Gmail returned ${messages.length} messages`);

    // Check each message
    for (const msgMeta of messages.slice(0, 20)) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgMeta.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!msgRes.ok) {
        logs.push(`  [${msgMeta.id}] Fetch failed (${msgRes.status})`);
        continue;
      }

      const msg = await msgRes.json();
      const headers = (msg.payload?.headers ?? []) as Array<{ name: string; value: string }>;
      const from = headers.find((h: { name: string }) => h.name === "From")?.value ?? "";
      const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value ?? "";

      const senderEmail = from.match(/<([^>]+)>/)?.[1] ?? from.split(" ").pop() ?? "";
      const isReceipt = isReceiptEmail(senderEmail.toLowerCase(), subject);

      logs.push(`  [${msgMeta.id}] From: ${senderEmail} | Subject: ${subject.substring(0, 60)} | Receipt: ${isReceipt}`);
    }
  }

  // Now run the actual scanner if not just debug
  if (!debug) {
    const { scanEmailsForReceipts } = await import("@/lib/email/scanner");
    try {
      totalImported = await scanEmailsForReceipts(session.user.id);
    } catch (err) {
      logs.push(`Scanner error: ${err}`);
    }
  }

  return NextResponse.json({ imported: totalImported, logs });
}
