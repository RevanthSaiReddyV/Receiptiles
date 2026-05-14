import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCardCategory } from "@/lib/rewards/card-database";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Google API error" }, { status: 502 });
    }

    const data = await res.json();
    const merchants = (data.results ?? []).slice(0, 15).map((place: {
      name: string;
      formatted_address: string;
      types: string[];
      rating?: number;
      geometry: { location: { lat: number; lng: number } };
      place_id: string;
    }) => {
      const category = mapPlaceTypeToCategory(place.types);
      return {
        name: place.name,
        address: place.formatted_address,
        category,
        rewardCategory: getCardCategory(place.name) || category,
        rating: place.rating,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        placeId: place.place_id,
      };
    });

    return NextResponse.json({ merchants }, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

function mapPlaceTypeToCategory(types: string[]): string {
  if (types.includes("restaurant") || types.includes("food") || types.includes("cafe") || types.includes("bakery") || types.includes("meal_delivery") || types.includes("meal_takeaway")) return "Dining";
  if (types.includes("grocery_or_supermarket") || types.includes("supermarket")) return "Groceries";
  if (types.includes("gas_station")) return "Gas";
  if (types.includes("shopping_mall") || types.includes("clothing_store") || types.includes("department_store") || types.includes("shoe_store") || types.includes("jewelry_store")) return "Shopping";
  if (types.includes("electronics_store")) return "Electronics";
  if (types.includes("pharmacy") || types.includes("drugstore") || types.includes("health")) return "Drugstores";
  if (types.includes("gym")) return "Fitness";
  if (types.includes("movie_theater") || types.includes("amusement_park") || types.includes("bowling_alley")) return "Entertainment";
  if (types.includes("lodging") || types.includes("hotel")) return "Hotels";
  if (types.includes("airport") || types.includes("travel_agency") || types.includes("car_rental")) return "Travel";
  if (types.includes("transit_station") || types.includes("subway_station") || types.includes("bus_station")) return "Transit";
  return "Shopping";
}
