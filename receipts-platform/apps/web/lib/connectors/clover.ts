import type {
  PosConnector,
  ConnectorCredentials,
  FetchOrdersOptions,
  PosOrder,
} from "./types";

const CLOVER_BASE_URL = "https://sandbox.dev.clover.com"; // Change to https://api.clover.com for production

export const cloverConnector: PosConnector = {
  id: "clover",
  name: "Clover",

  getAuthUrl(merchantId: string, redirectUri: string) {
    const params = new URLSearchParams({
      client_id: process.env.CLOVER_APP_ID!,
      redirect_uri: redirectUri,
      state: merchantId,
    });
    return `${CLOVER_BASE_URL}/oauth/authorize?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const params = new URLSearchParams({
      client_id: process.env.CLOVER_APP_ID!,
      client_secret: process.env.CLOVER_APP_SECRET!,
      code,
    });

    const res = await fetch(`${CLOVER_BASE_URL}/oauth/token?${params}`);
    if (!res.ok) throw new Error(`Clover OAuth failed: ${res.statusText}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: "",
      expiresAt: new Date(Date.now() + 365 * 86400000),
      merchantId: data.merchant_id ?? "",
    };
  },

  async refreshToken(credentials: ConnectorCredentials) {
    return credentials;
  },

  async fetchOrders(credentials: ConnectorCredentials, options: FetchOrdersOptions) {
    const { merchantId, accessToken } = credentials;
    const params = new URLSearchParams({
      limit: String(options.limit ?? 50),
      orderBy: "createdTime DESC",
      expand: "lineItems",
    });

    if (options.since) {
      params.set("filter", `createdTime>=${options.since.getTime()}`);
    }
    if (options.cursor) {
      params.set("offset", options.cursor);
    }

    const res = await fetch(
      `${CLOVER_BASE_URL}/v3/merchants/${merchantId}/orders?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) throw new Error(`Clover orders fetch failed: ${res.statusText}`);
    const data = await res.json();

    const orders: PosOrder[] = [];
    for (const order of data.elements ?? []) {
      const lineItems = order.lineItems?.elements ?? await fetchLineItems(merchantId, accessToken, order.id);
      orders.push(mapCloverOrder(order, lineItems));
    }

    return orders;
  },

  normalizeOrder(order: PosOrder) {
    return {
      source: "pos" as const,
      merchant: {
        rawName: order.merchantName,
        canonicalName: order.merchantName,
        category: "Dining",
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
        category: item.category ?? "Dining",
      })),
      metadata: {
        confidence: 1.0,
        requiresReview: false,
      },
    };
  },
};

async function fetchLineItems(merchantId: string, accessToken: string, orderId: string) {
  const res = await fetch(
    `${CLOVER_BASE_URL}/v3/merchants/${merchantId}/orders/${orderId}/line_items`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.elements ?? [];
}

interface CloverOrder {
  id: string;
  total: number;
  taxRemoved: boolean;
  createdTime: number;
  clientCreatedTime?: number;
  payType?: string;
  title?: string;
  lineItems?: { elements: CloverLineItem[] };
}

interface CloverLineItem {
  id: string;
  name: string;
  price: number;
  unitQty?: number;
  taxRates?: { elements: Array<{ rate: number }> };
  modifications?: { elements: Array<{ name: string; amount: number }> };
}

function mapCloverOrder(order: CloverOrder, lineItems: CloverLineItem[]): PosOrder {
  const items = lineItems.map((item) => {
    const qty = item.unitQty ? item.unitQty / 1000 : 1;
    return {
      name: item.name,
      quantity: qty,
      unitPrice: item.price / 100,
      totalPrice: (item.price * qty) / 100,
      modifiers: item.modifications?.elements?.map((m) => m.name),
    };
  });

  const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const totalCents = order.total ?? 0;
  const total = totalCents / 100;
  const tax = total - subtotal > 0 ? Math.round((total - subtotal) * 100) / 100 : 0;

  return {
    id: order.id,
    provider: "clover",
    rawData: order,
    merchantName: order.title ?? "Clover Merchant",
    items,
    subtotal,
    tax,
    tip: 0,
    discount: 0,
    total,
    currency: "USD",
    paymentMethod: order.payType ?? "unknown",
    createdAt: new Date(order.createdTime),
  };
}
