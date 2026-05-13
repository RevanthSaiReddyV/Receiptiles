import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@receipts/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/receipts/[id]/original
 *
 * Proxies the original receipt HTML from the merchant's POS system.
 * This bypasses X-Frame-Options restrictions so we can display it in our app.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const receipt = await db.receipt.findFirst({
    where: { id, userId: session.user.id },
    select: { receiptUrl: true, ocrText: true, source: true },
  });

  if (!receipt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // For POS receipts with a receipt URL, fetch and proxy the HTML
  if (receipt.receiptUrl) {
    try {
      const res = await fetch(receipt.receiptUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "text/html",
        },
      });

      if (!res.ok) {
        return new NextResponse(
          "<html><body style='display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui;color:#a1a1aa;font-size:13px'>Receipt not available</body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }

      let html = await res.text();

      // Inject base tag so relative URLs resolve correctly
      const baseUrl = new URL(receipt.receiptUrl).origin;
      html = html.replace("<head>", `<head><base href="${baseUrl}/">`);

      // Remove any frame-busting scripts
      html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch {
      return new NextResponse(
        "<html><body style='display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui;color:#a1a1aa;font-size:13px'>Receipt not available</body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
  }

  return new NextResponse(
    "<html><body style='display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui;color:#a1a1aa;font-size:13px'>Receipt not available</body></html>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
