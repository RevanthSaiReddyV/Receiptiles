import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Maps not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=name,formatted_address,geometry,rating,place_id&key=${apiKey}`
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Google API error" }, { status: 502 });
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];

    if (!candidate) {
      return NextResponse.json({ place: null });
    }

    return NextResponse.json({
      place: {
        name: candidate.name,
        address: candidate.formatted_address,
        lat: candidate.geometry.location.lat,
        lng: candidate.geometry.location.lng,
        rating: candidate.rating,
        placeId: candidate.place_id,
      },
    }, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to lookup" }, { status: 500 });
  }
}
