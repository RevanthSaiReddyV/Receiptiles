import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/card-image?url=<encoded-url>
 *
 * Proxies card art images from issuer CDNs, bypassing hotlink protection.
 * Caches for 7 days.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  // Only allow known issuer domains
  const allowed = [
    "creditcards.chase.com",
    "ecm.capitalone.com",
    "icm.aexp-static.com",
    "www.discover.com",
    "www.apple.com",
    "m.media-amazon.com",
    "www.citi.com",
    "www.wellsfargo.com",
    "www.bankofamerica.com",
    "www.usbank.com",
    "target.scene7.com",
    "i5.walmartimages.com",
  ];

  try {
    const parsed = new URL(url);
    if (!allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith("." + d))) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/*,*/*",
        "Referer": parsed.origin + "/",
      },
    });

    if (!res.ok) {
      return new NextResponse(null, { status: 404 });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
