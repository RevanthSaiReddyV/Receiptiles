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
    const merchants = (data.results ?? [])
      .filter((place: { types: string[] }) => isRetailPlace(place.types))
      .slice(0, 15)
      .map((place: {
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

const RETAIL_TYPES = new Set([
  "restaurant", "food", "cafe", "bakery", "bar", "meal_delivery", "meal_takeaway",
  "grocery_or_supermarket", "supermarket", "convenience_store", "liquor_store",
  "gas_station", "shopping_mall", "clothing_store", "department_store", "shoe_store",
  "jewelry_store", "furniture_store", "home_goods_store", "hardware_store",
  "book_store", "pet_store", "florist", "electronics_store", "pharmacy", "drugstore",
  "gym", "movie_theater", "amusement_park", "bowling_alley", "spa", "night_club",
  "lodging", "airport", "travel_agency", "car_rental", "car_wash", "car_repair",
  "beauty_salon", "hair_care", "laundry", "store", "parking",
  "dentist", "doctor", "veterinary_care",
]);

function isRetailPlace(types: string[]): boolean {
  return types.some(t => RETAIL_TYPES.has(t));
}

function mapPlaceTypeToCategory(types: string[]): string {
  if (types.some(t => ["restaurant", "food", "cafe", "bakery", "bar", "meal_delivery", "meal_takeaway", "night_club"].includes(t))) return "Dining";
  if (types.some(t => ["grocery_or_supermarket", "supermarket", "convenience_store", "liquor_store"].includes(t))) return "Groceries";
  if (types.includes("gas_station")) return "Gas";
  if (types.some(t => ["shopping_mall", "clothing_store", "department_store", "shoe_store", "jewelry_store", "furniture_store", "home_goods_store", "hardware_store", "book_store", "pet_store", "florist"].includes(t))) return "Shopping";
  if (types.includes("electronics_store")) return "Electronics";
  if (types.some(t => ["pharmacy", "drugstore"].includes(t))) return "Drugstores";
  if (types.includes("gym")) return "Fitness";
  if (types.some(t => ["movie_theater", "amusement_park", "bowling_alley", "spa"].includes(t))) return "Entertainment";
  if (types.includes("lodging")) return "Hotels";
  if (types.some(t => ["airport", "travel_agency", "car_rental"].includes(t))) return "Travel";
  if (types.includes("transit_station") || types.includes("subway_station") || types.includes("bus_station")) return "Transit";
  return "Shopping";
}
