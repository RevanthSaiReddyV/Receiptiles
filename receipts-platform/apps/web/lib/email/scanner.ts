import { db } from "@receipts/db";
import { parseReceiptFromText } from "@/lib/ocr";
import { detectRetailer, isReceiptEmail } from "./detector";
import { parseReceiptEmail } from "./parsers";

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: Array<{ mimeType: string; body?: { data?: string } }>;
    }>;
  };
  internalDate: string;
}

export async function scanEmailsForReceipts(userId: string) {
  const connections = await db.emailConnection.findMany({
    where: { userId, isActive: true },
  });

  let totalImported = 0;

  for (const connection of connections) {
    const accessToken = await getValidToken(connection);
    if (!accessToken) continue;

    const since = connection.lastSyncAt ?? new Date(Date.now() - 7 * 86400000);
    const afterTimestamp = Math.floor(since.getTime() / 1000);

    const query = `after:${afterTimestamp} (subject:receipt OR subject:"order confirm" OR subject:invoice OR from:auto-confirm@amazon.com OR from:help@walmart.com OR from:no-reply@instacart.com OR from:no-reply@doordash.com OR from:uber.us@uber.com)`;

    const messages = await fetchGmailMessages(accessToken, query);

    for (const msgMeta of messages) {
      const msg = await fetchGmailMessage(accessToken, msgMeta.id);
      if (!msg) continue;

      const from = getHeader(msg, "From") ?? "";
      const subject = getHeader(msg, "Subject") ?? "";
      const senderEmail = extractEmail(from);

      if (!isReceiptEmail(senderEmail, subject)) continue;

      const alreadyProcessed = await db.receipt.findFirst({
        where: {
          userId,
          source: "EMAIL",
          ocrText: { contains: msgMeta.id },
        },
      });
      if (alreadyProcessed) continue;

      const { htmlBody, plainBody } = extractBodies(msg);
      if (!htmlBody && !plainBody) continue;

      try {
        // 1. Try code-based parsers first ($0 cost)
        const { result: codeParsed, needsAI } = parseReceiptEmail(
          senderEmail, subject, htmlBody, plainBody
        );

        let parsed = codeParsed;

        // 2. Only fall back to GPT-4o if code parser totally failed
        if (!parsed && needsAI) {
          const body = plainBody || stripHtml(htmlBody);
          if (body.length < 50) continue;
          const aiParsed = await parseReceiptFromText(body);
          const retailer = detectRetailer(senderEmail, subject);
          if (retailer) {
            aiParsed.merchant.rawName = aiParsed.merchant.rawName || retailer.name;
            aiParsed.merchant.canonicalName = retailer.name;
            aiParsed.merchant.category = retailer.category;
          }
          parsed = aiParsed;
        }

        if (!parsed || parsed.purchase.total === 0) continue;

        await db.receipt.create({
          data: {
            userId,
            source: "EMAIL",
            merchantRawName: parsed.merchant.rawName,
            merchantCanonicalName: parsed.merchant.canonicalName,
            merchantCategory: parsed.merchant.category,
            merchantLocation: parsed.merchant.location,
            purchasedAt: new Date(parsed.purchase.purchasedAt),
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
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                category: item.category,
              })),
            },
          },
        });

        totalImported++;
      } catch {
        // skip unparseable emails
      }
    }

    await db.emailConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });
  }

  return totalImported;
}

async function getValidToken(connection: {
  id: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | null;
}): Promise<string | null> {
  if (connection.expiresAt && connection.expiresAt > new Date()) {
    return connection.accessToken;
  }

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

    if (!res.ok) return null;
    const data = await res.json();

    await db.emailConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    return data.access_token;
  } catch {
    return null;
  }
}

async function fetchGmailMessages(
  accessToken: string,
  query: string
): Promise<Array<{ id: string }>> {
  const params = new URLSearchParams({
    q: query,
    maxResults: "20",
  });

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.messages ?? [];
}

async function fetchGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;
  return res.json();
}

function getHeader(msg: GmailMessage, name: string): string | undefined {
  return msg.payload.headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )?.value;
}

function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/);
  return (match ? match[1] : from).toLowerCase().trim();
}

function extractBodies(msg: GmailMessage): { htmlBody: string; plainBody: string } {
  const htmlData = findPart(msg.payload, "text/html");
  const plainData = findPart(msg.payload, "text/plain");

  const htmlBody = htmlData ? Buffer.from(htmlData, "base64url").toString("utf-8") : "";
  const plainBody = plainData ? Buffer.from(plainData, "base64url").toString("utf-8") : "";

  return { htmlBody, plainBody };
}

type GmailPart = NonNullable<GmailMessage["payload"]["parts"]>[number];

function findPart(
  payload: GmailMessage["payload"] | GmailPart,
  mimeType: string
): string | null {
  if ("mimeType" in payload && payload.mimeType === mimeType && payload.body?.data) {
    return payload.body.data;
  }
  const parts = "parts" in payload ? payload.parts : undefined;
  if (parts) {
    for (const part of parts) {
      if (part.mimeType === mimeType && part.body?.data) return part.body.data;
      if (part.parts) {
        const nested = findPart(part as GmailMessage["payload"]["parts"][0], mimeType);
        if (nested) return nested;
      }
    }
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
