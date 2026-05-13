"use client";

import { useState, useEffect } from "react";

interface MerchantMapProps {
  merchantName: string;
  location: string | null;
}

interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  placeId: string;
}

export function MerchantMap({ merchantName, location }: MerchantMapProps) {
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function findPlace() {
      try {
        const query = location
          ? `${merchantName} ${location}`
          : merchantName;

        const res = await fetch(`/api/merchant-location?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        if (data.place) {
          setPlace(data.place);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    findPlace();
  }, [merchantName, location]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-4">
        <div className="h-[200px] bg-zinc-100 animate-pulse flex items-center justify-center">
          <span className="text-xs text-zinc-400">Loading map...</span>
        </div>
      </div>
    );
  }

  if (error || !place) return null;

  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${place.lat},${place.lng}&zoom=15&size=600x200&scale=2&maptype=roadmap&markers=color:0x8b5cf6|${place.lat},${place.lng}&style=feature:all|element:geometry|color:0xf5f5f5&style=feature:road|element:geometry|color:0xffffff&style=feature:water|element:geometry|color:0xe8eaf6&style=feature:poi|element:labels|visibility:off&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ""}`;

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.placeId}`;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm overflow-hidden mb-4">
      <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={mapUrl}
          alt={`Map showing ${place.name}`}
          className="w-full h-[160px] object-cover"
          loading="lazy"
        />
      </a>
      <div className="px-5 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900">{place.name}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{place.address}</p>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
          </svg>
          Directions
        </a>
      </div>
    </div>
  );
}
