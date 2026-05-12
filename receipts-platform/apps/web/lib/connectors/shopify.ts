import type {
  PosConnector,
  ConnectorCredentials,
  FetchOrdersOptions,
  PosOrder,
} from "./types";

export const shopifyConnector: PosConnector = {
  id: "shopify",
  name: "Shopify",

  getAuthUrl(shop: string, redirectUri: string) {
    const scopes = "read_orders,read_products,read_locations";
    return `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${shop}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const shop = new URL(redirectUri).searchParams.get("shop") ?? "";

    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID!,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET!,
        code,
      }),
    });

    if (!res.ok) throw new Error(`Shopify OAuth failed: ${res.statusText}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: "",
      expiresAt: new Date(Date.now() + 365 * 86400000),
      merchantId: shop,
      metadata: { shop },
    };
  },

  async refreshToken(credentials: ConnectorCredentials) {
    return credentials;
  },

  async fetchOrders(credentials: ConnectorCredentials, options: FetchOrdersOptions) {
    const shop = credentials.metadata?.shop ?? credentials.merchantId;
    const params = new URLSearchParams({
      status: "any",
      limit: String(options.limit ?? 50),
      order: "created_at desc",
    });

    if (options.since) params.set("created_at_min", options.since.toISOString());
    if (options.until) params.set("created_at_max", options.until.toISOString());
    if (options.cursor) params.set("page_info", options.cursor);

    const res = await fetch(
      `https://${shop}/admin/api/2024-01/orders.json?${params}`,
      {
        headers: {
          "X-Shopify-Access-Token": credentials.accessToken,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) throw new Error(`Shopify orders fetch failed: ${res.statusText}`);
    const data = await res.json();

    return (data.orders ?? []).map(mapShopifyOrder);
  },

  normalizeOrder(order: PosOrder) {
    return {
      source: "pos" as const,
      merchant: {
        rawName: order.merchantName,
        canonicalName: order.merchantName,
        category: "Shopping",
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
        category: item.category ?? "Shopping",
      })),
      metadata: {
        confidence: 1.0,
        requiresReview: false,
      },
    };
  },
};

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  currency: string;
  source_name: string;
  line_items: Array<{
    name: string;
    quantity: number;
    price: string;
    variant_title?: string;
    sku?: string;
  }>;
  payment_gateway_names?: string[];
  location_id?: number;
}

function mapShopifyOrder(order: ShopifyOrder): PosOrder {
  return {
    id: String(order.id),
    provider: "shopify",
    rawData: order,
    merchantName: order.source_name === "pos" ? "Shopify POS" : "Shopify Online",
    items: order.line_items.map((item) => ({
      name: item.variant_title ? `${item.name} - ${item.variant_title}` : item.name,
      quantity: item.quantity,
      unitPrice: parseFloat(item.price),
      totalPrice: parseFloat(item.price) * item.quantity,
    })),
    subtotal: parseFloat(order.subtotal_price),
    tax: parseFloat(order.total_tax),
    tip: 0,
    discount: parseFloat(order.total_discounts),
    total: parseFloat(order.total_price),
    currency: order.currency,
    paymentMethod: order.payment_gateway_names?.[0] ?? "unknown",
    createdAt: new Date(order.created_at),
  };
}
