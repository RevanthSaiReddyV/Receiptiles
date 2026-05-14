import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCardCategory } from "@/lib/rewards/card-database";

// Place types where consumers make card payments
const RETAIL_TYPES = new Set([
  "restaurant", "food", "cafe", "bakery", "bar", "meal_delivery", "meal_takeaway",
  "grocery_or_supermarket", "supermarket", "convenience_store", "liquor_store",
  "gas_station",
  "shopping_mall", "clothing_store", "department_store", "shoe_store",
  "jewelry_store", "furniture_store", "home_goods_store", "hardware_store",
  "book_store", "pet_store", "florist", "bicycle_store",
  "electronics_store",
  "pharmacy", "drugstore",
  "gym",
  "movie_theater", "amusement_park", "bowling_alley", "night_club", "spa",
  "lodging",
  "airport", "travel_agency", "car_rental", "car_wash", "car_repair",
  "beauty_salon", "hair_care",
  "laundry", "veterinary_care", "dentist", "doctor",
  "parking",
  "store",
]);

// Types to explicitly exclude — never a card payment destination
const EXCLUDE_TYPES = new Set([
  "locality", "political", "neighborhood", "sublocality",
  "administrative_area_level_1", "administrative_area_level_2",
  "country", "postal_code", "route", "street_address",
  "premise", "subpremise", "natural_feature", "point_of_interest",
  "real_estate_agency", "local_government_office", "city_hall",
  "courthouse", "fire_station", "police", "post_office",
  "church", "mosque", "synagogue", "hindu_temple",
  "cemetery", "funeral_home",
  "school", "university", "library", "museum",
  "park", "campground",
  "embassy", "lawyer", "insurance_agency", "accounting",
  "moving_company", "storage", "roofing_contractor", "plumber",
  "electrician", "painter", "locksmith",
  "apartment", "condominium",
]);

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
    // Make multiple requests for different retail types to get better results
    const queries = [
      `location=${lat},${lng}&radius=800&type=restaurant`,
      `location=${lat},${lng}&radius=800&type=store`,
      `location=${lat},${lng}&radius=800&type=gas_station`,
      `location=${lat},${lng}&radius=800&type=shopping_mall`,
      `location=${lat},${lng}&radius=800&type=cafe`,
      `location=${lat},${lng}&radius=800&type=supermarket`,
    ];

    const allPlaces = new Map<string, PlaceResult>();

    for (const query of queries) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${query}&key=${apiKey}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const place of (data.results ?? [])) {
        if (!allPlaces.has(place.place_id)) {
          allPlaces.set(place.place_id, place);
        }
      }
    }

    const merchants = Array.from(allPlaces.values())
      .filter(place => isRetailPlace(place.types))
      .slice(0, 20)
      .map(place => {
        const category = mapPlaceTypeToCategory(place.types);
        return {
          name: place.name,
          address: place.vicinity ?? place.formatted_address ?? "",
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
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

interface PlaceResult {
  name: string;
  vicinity?: string;
  formatted_address?: string;
  types: string[];
  rating?: number;
  geometry: { location: { lat: number; lng: number } };
  place_id: string;
}

function isRetailPlace(types: string[]): boolean {
  // Must have at least one retail type
  const hasRetail = types.some(t => RETAIL_TYPES.has(t));
  // Must NOT be primarily an excluded type
  const isExcluded = types.some(t => EXCLUDE_TYPES.has(t)) && !hasRetail;
  return hasRetail && !isExcluded;
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
  if (types.some(t => ["beauty_salon", "hair_care"].includes(t))) return "Shopping";
  if (types.some(t => ["car_wash", "car_repair", "laundry"].includes(t))) return "Shopping";
  if (types.some(t => ["dentist", "doctor", "veterinary_care"].includes(t))) return "Drugstores";
  if (types.includes("store")) return "Shopping";
  return "Shopping";
}
