import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";
import * as cheerio from "cheerio";
import { isReceiptEmail, detectRetailer } from "@/lib/email/detector";
import { parseReceiptEmail } from "@/lib/email/parsers";
import { parseReceiptFromText } from "@/lib/ocr";
import { isBankAlert, parseBankAlert } from "@/lib/email/parsers/bank-alerts";

export const maxDuration = 60;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const logs: string[] = [];
  let totalImported = 0;

  // Reset lastSyncAt for full rescan
  await db.emailConnection.updateMany({
    where: { userId },
    data: { lastSyncAt: null },
  });

  const connections = await db.emailConnection.findMany({
    where: { userId, isActive: true },
  });

  if (connections.length === 0) {
    return NextResponse.json({ error: "No email connections", imported: 0, logs: ["No active connections"] });
  }

  for (const connection of connections) {
    logs.push(`--- ${connection.email} ---`);

    // Get valid token
    let accessToken = connection.accessToken;
    if (connection.expiresAt && connection.expiresAt <= new Date()) {
      logs.push(`Token expired, refreshing...`);
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
          logs.push(`Token refresh FAILED: ${errBody}`);
          continue;
        }
        const data = await res.json();
        accessToken = data.access_token;
        await db.emailConnection.update({
          where: { id: connection.id },
          data: { accessToken, expiresAt: new Date(Date.now() + data.expires_in * 1000) },
        });
        logs.push(`Token refreshed OK`);
      } catch (err) {
        logs.push(`Token exception: ${err}`);
        continue;
      }
    } else {
      logs.push(`Token valid`);
    }

    // Search Gmail
    const since = new Date(Date.now() - 90 * 86400000);
    const afterTs = Math.floor(since.getTime() / 1000);
    const query = `after:${afterTs} (subject:receipt OR subject:"order confirmation" OR subject:"order confirmed" OR subject:invoice OR subject:"your trip" OR subject:"your ride" OR subject:"your order" OR subject:"your purchase" OR subject:"ordered:" OR subject:"transaction alert" OR subject:"purchase notification" OR subject:"card transaction" OR subject:"large purchase" OR from:uber.com OR from:lyft.com OR from:amazon.com OR from:walmart.com OR from:instacart.com OR from:doordash.com OR from:grubhub.com OR from:target.com OR from:costco.com OR from:apple.com OR from:bestbuy.com OR from:starbucks.com OR from:etsy.com OR from:paypal.com OR from:chase.com OR from:aexp.com OR from:bankofamerica.com OR from:capitalone.com OR from:citi.com OR from:citibank.com OR from:wellsfargo.com OR from:discover.com)`;

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
    logs.push(`Found ${messages.length} candidate emails`);

    for (const msgMeta of messages.slice(0, 30)) {
      // Fetch full message
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgMeta.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!msgRes.ok) {
        logs.push(`  [${msgMeta.id}] fetch failed`);
        continue;
      }

      const msg = await msgRes.json();
      const headers = (msg.payload?.headers ?? []) as Array<{ name: string; value: string }>;
      const from = headers.find((h: { name: string }) => h.name === "From")?.value ?? "";
      const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value ?? "";
      const senderEmail = (from.match(/<([^>]+)>/)?.[1] ?? from.split(" ").pop() ?? "").toLowerCase();
      const emailDate = msg.internalDate ? new Date(parseInt(msg.internalDate)) : new Date();

      // Soft reject: skip obvious non-receipts but let everything else through
      // since Gmail already pre-filtered with our receipt query
      const hardReject = /\[.*\/.*\]|pull request|merge|commit|unsubscribe here|noreply@github|delivery estimate|tracking update|out for delivery/i;
      if (hardReject.test(subject) || senderEmail.includes("github.com")) {
        logs.push(`  [${subject.substring(0, 40)}] rejected (non-receipt)`);
        continue;
      }

      // Check dedup
      const exists = await db.receipt.findFirst({
        where: { userId, source: "EMAIL", ocrText: { contains: msgMeta.id } },
      });
      if (exists) {
        logs.push(`  [${subject.substring(0, 40)}] already imported`);
        continue;
      }

      // Extract body
      const { htmlBody, plainBody } = extractBodies(msg);
      if (!htmlBody && !plainBody) {
        logs.push(`  [${subject.substring(0, 40)}] no body`);
        continue;
      }

      const bodyText = plainBody || stripHtml(htmlBody);

      // Check if this is a bank transaction alert
      if (isBankAlert(senderEmail, subject)) {
        const bankParsed = parseBankAlert(senderEmail, subject, bodyText);
        if (bankParsed && bankParsed.purchase.total > 0) {
          const purchaseDate = new Date(bankParsed.purchase.purchasedAt);
          const isValidDate = !isNaN(purchaseDate.getTime()) && purchaseDate.toDateString() !== new Date().toDateString();

          try {
            await db.receipt.create({
              data: {
                userId,
                source: "EMAIL",
                merchantRawName: bankParsed.merchant.rawName,
                merchantCanonicalName: bankParsed.merchant.canonicalName,
                merchantCategory: bankParsed.merchant.category,
                purchasedAt: isValidDate ? purchaseDate : emailDate,
                currency: "USD",
                subtotal: bankParsed.purchase.total,
                tax: 0,
                tip: 0,
                discount: 0,
                fees: 0,
                total: bankParsed.purchase.total,
                paymentMethod: "card",
                cardLast4: bankParsed.payment.cardLast4,
                confidence: 0.8,
                requiresReview: false,
                ocrText: `email:${msgMeta.id}`,
              },
            });
            totalImported++;
            logs.push(`  [${subject.substring(0, 40)}] BANK ALERT: ${bankParsed.merchant.canonicalName} $${bankParsed.purchase.total}`);
            continue;
          } catch (err) {
            logs.push(`  [${subject.substring(0, 40)}] bank alert save failed: ${err instanceof Error ? err.message : err}`);
          }
        }
      }

      // Try code parsers
      const { result: codeParsed, parser: parserUsed, needsAI } = parseReceiptEmail(
        senderEmail, subject, htmlBody, plainBody
      );

      let parsed = codeParsed;

      if (!parsed && process.env.OPENAI_API_KEY) {
        try {
          const body = plainBody || stripHtml(htmlBody);
          if (body.length >= 50) {
            const aiParsed = await parseReceiptFromText(body);
            const retailer = detectRetailer(senderEmail, subject);
            if (retailer) {
              aiParsed.merchant.rawName = aiParsed.merchant.rawName || retailer.name;
              aiParsed.merchant.canonicalName = retailer.name;
              aiParsed.merchant.category = retailer.category;
            }
            parsed = { ...aiParsed, metadata: { confidence: 0.7, requiresReview: true } } as typeof codeParsed;
            logs.push(`  [${subject.substring(0, 40)}] AI parsed: $${aiParsed.purchase.total}`);
          }
        } catch (err) {
          logs.push(`  [${subject.substring(0, 40)}] AI failed: ${err instanceof Error ? err.message : err}`);
        }
      }

      if (!parsed || parsed.purchase.total === 0) {
        logs.push(`  [${subject.substring(0, 40)}] parser=${parserUsed}, total=0, skipped`);
        continue;
      }

      // Fix "Unknown" merchants — derive from sender email domain
      if (!parsed.merchant.canonicalName || parsed.merchant.canonicalName === "Unknown" || parsed.merchant.canonicalName === "") {
        const domain = senderEmail.split("@")[1]?.split(".")[0] ?? "";
        const fromName = from.replace(/<[^>]+>/, "").trim().replace(/"/g, "");
        parsed.merchant.rawName = fromName || domain;
        parsed.merchant.canonicalName = fromName || domain.charAt(0).toUpperCase() + domain.slice(1);
      }

      // Fix dates — use email date if parser returned today's date or invalid
      const parsedDate = new Date(parsed.purchase.purchasedAt);
      const now = new Date();
      const isToday = parsedDate.toDateString() === now.toDateString();
      const isInvalid = isNaN(parsedDate.getTime());
      const purchaseDate = (isToday || isInvalid) ? emailDate : parsedDate;

      try {
        await db.receipt.create({
          data: {
            userId,
            source: "EMAIL",
            merchantRawName: parsed.merchant.rawName,
            merchantCanonicalName: parsed.merchant.canonicalName,
            merchantCategory: parsed.merchant.category,
            merchantLocation: parsed.merchant.location,
            purchasedAt: purchaseDate,
            currency: parsed.purchase.currency,
            subtotal: parsed.purchase.subtotal,
            tax: parsed.purchase.tax,
            tip: parsed.purchase.tip,
            discount: parsed.purchase.discount,
            fees: parsed.purchase.fees,
            total: parsed.purchase.total,
            paymentMethod: parsed.payment.method,
            cardLast4: parsed.payment.cardLast4,
            walletType: parsed.payment.walletType,
            confidence: parsed.metadata.confidence,
            requiresReview: parsed.metadata.requiresReview,
            ocrText: `email:${msgMeta.id}`,
            items: {
              create: parsed.items.map((item) => ({
                rawName: item.rawName,
                name: item.name,
                description: item.description,
                imageUrl: item.imageUrl,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                category: item.category,
                sku: item.sku,
                productUrl: item.productUrl,
              })),
            },
          },
        });
        totalImported++;
        logs.push(`  [${subject.substring(0, 40)}] SAVED via ${parserUsed}: ${parsed.merchant.canonicalName} $${parsed.purchase.total}`);
      } catch (err) {
        logs.push(`  [${subject.substring(0, 40)}] DB save failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    await db.emailConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });
  }

  logs.push(`\nDone. Imported ${totalImported} receipts.`);
  return NextResponse.json({ imported: totalImported, logs });
}

// --- helpers ---

function extractBodies(msg: { payload: Record<string, unknown> }): { htmlBody: string; plainBody: string } {
  let htmlBody = "";
  let plainBody = "";

  function walk(part: Record<string, unknown>) {
    const mime = part.mimeType as string | undefined;
    const body = part.body as { data?: string } | undefined;
    const parts = part.parts as Record<string, unknown>[] | undefined;

    if (mime === "text/html" && body?.data) {
      htmlBody = Buffer.from(body.data, "base64url").toString("utf-8");
    } else if (mime === "text/plain" && body?.data) {
      plainBody = Buffer.from(body.data, "base64url").toString("utf-8");
    }

    if (parts) {
      for (const p of parts) walk(p);
    }
  }

  walk(msg.payload);
  return { htmlBody, plainBody };
}

function stripHtml(html: string): string {
  if (!html) return "";
  return cheerio.load(html).text().replace(/\s+/g, " ").trim();
}
