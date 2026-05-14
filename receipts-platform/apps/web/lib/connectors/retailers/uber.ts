import type { RetailerConnector, RetailerAuth, RetailerOrder, RetailerOrderItem } from "./types";

const UBER_API = "https://riders.uber.com/api/getTripsForClient";

export const uberConnector: RetailerConnector = {
  id: "uber",
  name: "Uber (Rides)",

  async fetchOrders(auth: RetailerAuth, since: Date): Promise<RetailerOrder[]> {
    const allOrders: RetailerOrder[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      console.log(`[Uber] Fetching trips${cursor ? ` cursor: ${cursor.slice(0, 8)}...` : ""}`);

      try {
        const body: any = { limit: 20, range: { fromTime: since.getTime() } };
        if (cursor) body.cursor = cursor;

        const res = await fetch(UBER_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: auth.authToken,
            "x-csrf-token": auth.metadata?.csrfToken ?? "",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) break;

        const data = await res.json();
        const trips = data?.data?.trips ?? [];
        cursor = data?.data?.nextCursor;

        if (trips.length === 0) break;

        for (const trip of trips) {
          allOrders.push(normalizeUberTrip(trip));
        }

        if (!cursor) hasMore = false;
      } catch (err) {
        console.error(`[Uber] Error:`, err);
        hasMore = false;
      }
    }

    return allOrders;
  },
};

function normalizeUberTrip(trip: any): RetailerOrder {
  const fare = trip.clientFare ?? trip.fare ?? 0;
  const items: RetailerOrderItem[] = [{
    name: `${trip.vehicleViewName ?? "Ride"}: ${trip.begTripAddress ?? ""} → ${trip.dropoffAddress ?? ""}`,
    quantity: 1,
    unitPrice: fare,
    totalPrice: fare,
    category: "Transportation",
  }];

  return {
    orderId: `uber-${trip.uuid ?? trip.tripId}`,
    retailer: "uber",
    merchantName: "Uber",
    purchasedAt: new Date(trip.requestTime ?? trip.startTime),
    items,
    subtotal: fare,
    tax: 0,
    total: fare,
    currency: trip.currencyCode ?? "USD",
    paymentMethod: trip.paymentMethod?.type?.toLowerCase() ?? "card",
    cardLast4: trip.paymentMethod?.lastFour,
    rawData: trip,
  };
}
