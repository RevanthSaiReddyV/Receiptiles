import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCardCategory } from "@/lib/rewards/card-database";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Maps not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=500&type=establishment&key=${apiKey}`
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Google API error" }, { status: 502 });
    }

    const data = await res.json();
    const merchants = (data.results ?? []).slice(0, 12).map((place: {
      name: string;
      vicinity: string;
      types: string[];
      rating?: number;
      geometry: { location: { lat: number; lng: number } };
      place_id: string;
    }) => {
      const category = mapPlaceTypeToCategory(place.types);
      return {
        name: place.name,
        address: place.vicinity,
        category,
        rewardCategory: getCardCategory(place.name) || category,
        rating: place.rating,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        placeId: place.place_id,
        types: place.types.slice(0, 3),
      };
    });

    return NextResponse.json({ merchants }, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

function mapPlaceTypeToCategory(types: string[]): string {
  if (types.includes("restaurant") || types.includes("food") || types.includes("cafe") || types.includes("bakery")) return "Dining";
  if (types.includes("grocery_or_supermarket") || types.includes("supermarket")) return "Groceries";
  if (types.includes("gas_station")) return "Gas";
  if (types.includes("shopping_mall") || types.includes("clothing_store") || types.includes("department_store")) return "Shopping";
  if (types.includes("electronics_store")) return "Electronics";
  if (types.includes("pharmacy") || types.includes("drugstore")) return "Drugstores";
  if (types.includes("gym") || types.includes("health")) return "Fitness";
  if (types.includes("movie_theater") || types.includes("amusement_park")) return "Entertainment";
  if (types.includes("lodging") || types.includes("hotel")) return "Hotels";
  if (types.includes("airport") || types.includes("travel_agency")) return "Travel";
  return "Shopping";
}
