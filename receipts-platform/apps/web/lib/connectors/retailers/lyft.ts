import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const LYFT_API = "https://www.lyft.com/api/rides/history";

export const lyftConnector: RetailerConnector = {
  id: "lyft",
  name: "Lyft",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Lyft] Fetching rides`);

      try {
        const params = new URLSearchParams({ limit: "20" });
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`${LYFT_API}?${params}`, {
          headers: {
            Cookie: auth.authToken,
            Accept: "application/json",
          },
        });

        if (!res.ok) break;

        const data = await res.json();
        const rides = data?.rides ?? data?.data ?? [];
        cursor = data?.cursor ?? data?.nextCursor;

        if (rides.length === 0) break;

        for (const ride of rides) {
          const purchasedAt = new Date(ride.requestedAt ?? ride.pickup?.time);
          if (purchasedAt < since) {
            hasMore = false;
            break;
          }
          allOrders.push(normalizeLyftRide(ride));
        }

        if (!cursor) hasMore = false;
      } catch (err) {
        console.error(`[Lyft] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeLyftRide(ride: any): RetailerOrder {
  const total = (ride.price?.amount ?? ride.totalPrice ?? 0) / 100;
  const items: RetailerOrderItem[] = [{
    name: `${ride.rideType ?? "Ride"}: ${ride.pickup?.address ?? ""} → ${ride.dropoff?.address ?? ""}`,
    quantity: 1,
    unitPrice: total,
    totalPrice: total,
    category: "Transportation",
  }];

  return {
    orderId: `lyft-${ride.rideId ?? ride.id}`,
    retailer: "lyft",
    merchantName: "Lyft",
    purchasedAt: new Date(ride.requestedAt ?? ride.pickup?.time),
    items,
    subtotal: total,
    tax: 0,
    total,
    currency: "USD",
    paymentMethod: ride.paymentMethod?.type?.toLowerCase() ?? "card",
    cardLast4: ride.paymentMethod?.lastFour,
    rawData: ride,
  };
}
