import type {
  PosConnector,
  ConnectorCredentials,
  FetchOrdersOptions,
  PosOrder,
} from "./types";

const isSandbox = process.env.SQUARE_APP_ID?.startsWith("sandbox-");
const SQUARE_BASE_URL = isSandbox
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";
const SQUARE_API_VERSION = "2024-01-18";

export const squareConnector: PosConnector = {
  id: "square",
  name: "Square",

  getAuthUrl(merchantId: string, redirectUri: string) {
    const params = new URLSearchParams({
      client_id: process.env.SQUARE_APP_ID!,
      redirect_uri: redirectUri,
      scope: "PAYMENTS_READ ORDERS_READ MERCHANT_PROFILE_READ ITEMS_READ",
      session: "false",
      state: merchantId || "connect",
    });
    return `${SQUARE_BASE_URL}/oauth2/authorize?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const body = {
      client_id: process.env.SQUARE_APP_ID!,
      client_secret: process.env.SQUARE_APP_SECRET!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    };
    console.log("[Square] Token exchange request:", { ...body, client_secret: "***", code: code.slice(0, 8) + "..." });

    const res = await fetch(`${SQUARE_BASE_URL}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Square] Token exchange error:", res.status, errBody);
      throw new Error(`Square OAuth failed (${res.status}): ${errBody}`);
    }
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
      merchantId: data.merchant_id,
    };
  },

  async refreshToken(credentials: ConnectorCredentials) {
    const res = await fetch(`${SQUARE_BASE_URL}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SQUARE_APP_ID!,
        client_secret: process.env.SQUARE_APP_SECRET!,
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) throw new Error(`Square token refresh failed: ${res.statusText}`);
    const data = await res.json();

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
    };
  },

  async fetchOrders(credentials: ConnectorCredentials, options: FetchOrdersOptions) {
    const locations = await fetchLocations(credentials.accessToken);
    const locationIds = options.locationId
      ? [options.locationId]
      : locations.map((l: { id: string }) => l.id);

    const body: Record<string, unknown> = {
      location_ids: locationIds,
      query: {
        filter: {
          state_filter: { states: ["COMPLETED"] },
          date_time_filter: {
            closed_at: {
              start_at: (options.since ?? new Date(Date.now() - 30 * 86400000)).toISOString(),
              end_at: (options.until ?? new Date()).toISOString(),
            },
          },
        },
        sort: { sort_field: "CLOSED_AT", sort_order: "DESC" },
      },
      limit: options.limit ?? 50,
      ...(options.cursor ? { cursor: options.cursor } : {}),
    };

    const res = await fetch(`${SQUARE_BASE_URL}/v2/orders/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_API_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Square orders fetch failed: ${res.statusText}`);
    const data = await res.json();

    return (data.orders ?? []).map((order: SquareOrder) =>
      mapSquareOrder(order, locations)
    );
  },

  normalizeOrder(order: PosOrder) {
    return {
      source: "pos" as const,
      merchant: {
        rawName: order.merchantName,
        canonicalName: order.merchantName,
        category: "Uncategorized",
        location: order.merchantLocation ?? null,
      },
      purchase: {
        purchasedAt: order.createdAt.toISOString(),
        currency: order.currency,
        subtotal: order.subtotal,
        tax: order.tax,
        tip: order.tip,
        discount: order.discount,
        fees: 0,
        total: order.total,
      },
      payment: {
        method: order.paymentMethod ?? "card",
        cardId: null,
        cardLast4: order.cardLast4 ?? null,
        walletType: null,
        entryMode: null,
      },
      items: order.items.map((item) => ({
        rawName: item.name,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        category: item.category ?? "Uncategorized",
      })),
      metadata: {
        confidence: 1.0,
        requiresReview: false,
      },
    };
  },
};

async function fetchLocations(accessToken: string) {
  const res = await fetch(`${SQUARE_BASE_URL}/v2/locations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": SQUARE_API_VERSION,
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.locations ?? [];
}

interface SquareOrder {
  id: string;
  location_id: string;
  line_items?: Array<{
    name: string;
    quantity: string;
    base_price_money?: { amount: number; currency: string };
    total_money?: { amount: number; currency: string };
    applied_taxes?: Array<{ tax_uid: string }>;
    modifiers?: Array<{ name: string }>;
  }>;
  total_money?: { amount: number; currency: string };
  total_tax_money?: { amount: number; currency: string };
  total_discount_money?: { amount: number; currency: string };
  total_tip_money?: { amount: number; currency: string };
  tenders?: Array<{
    type: string;
    card_details?: { card: { last_4: string; card_brand: string } };
    tip_money?: { amount: number };
  }>;
  closed_at?: string;
  created_at: string;
}

function mapSquareOrder(
  order: SquareOrder,
  locations: Array<{ id: string; name: string; address?: { locality?: string } }>
): PosOrder {
  const location = locations.find((l) => l.id === order.location_id);
  const tender = order.tenders?.[0];
  const totalCents = order.total_money?.amount ?? 0;
  const taxCents = order.total_tax_money?.amount ?? 0;
  const discountCents = order.total_discount_money?.amount ?? 0;
  const tipCents = order.total_tip_money?.amount ?? 0;

  return {
    id: order.id,
    provider: "square",
    rawData: order,
    merchantName: location?.name ?? "Unknown Merchant",
    merchantLocation: location?.address?.locality,
    items: (order.line_items ?? []).map((item) => ({
      name: item.name,
      quantity: parseInt(item.quantity) || 1,
      unitPrice: (item.base_price_money?.amount ?? 0) / 100,
      totalPrice: (item.total_money?.amount ?? 0) / 100,
      modifiers: item.modifiers?.map((m) => m.name),
    })),
    subtotal: (totalCents - taxCents - tipCents + discountCents) / 100,
    tax: taxCents / 100,
    tip: tipCents / 100,
    discount: discountCents / 100,
    total: totalCents / 100,
    currency: order.total_money?.currency ?? "USD",
    paymentMethod: tender?.type ?? "unknown",
    cardLast4: tender?.card_details?.card.last_4,
    cardBrand: tender?.card_details?.card.card_brand,
    createdAt: new Date(order.closed_at ?? order.created_at),
  };
}
