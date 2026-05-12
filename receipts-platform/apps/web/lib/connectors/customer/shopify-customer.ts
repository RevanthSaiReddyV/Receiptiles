import type {
  CustomerConnector,
  CustomerCredentials,
  FetchTransactionsOptions,
  CustomerTransaction,
} from "./types";

export const shopifyCustomerConnector: CustomerConnector = {
  id: "shopify-customer",
  name: "Shopify Stores",
  description: "Import order history from Shopify stores you've purchased from",
  icon: "shopify",

  getAuthUrl(redirectUri: string, state: string) {
    const shop = state;
    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_STOREFRONT_ID!,
      scope: "openid email customer-account-api:full",
      redirect_uri: redirectUri,
      state: shop,
      response_type: "code",
    });
    return `https://${shop}/authentication/authorize?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const shop = new URL(redirectUri).searchParams.get("state") ?? "";

    const res = await fetch(`https://${shop}/authentication/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_STOREFRONT_ID!,
        client_secret: process.env.SHOPIFY_STOREFRONT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) throw new Error(`Shopify Customer OAuth failed: ${res.statusText}`);
    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? "",
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
      accountId: data.customer_id ?? "",
      email: data.email,
      metadata: { shop },
    };
  },

  async refreshToken(credentials: CustomerCredentials) {
    const shop = credentials.metadata?.shop ?? "";

    const res = await fetch(`https://${shop}/authentication/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_STOREFRONT_ID!,
        client_secret: process.env.SHOPIFY_STOREFRONT_SECRET!,
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!res.ok) throw new Error(`Shopify token refresh failed: ${res.statusText}`);
    const data = await res.json();

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? credentials.refreshToken,
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    };
  },

  async fetchTransactions(credentials: CustomerCredentials, options: FetchTransactionsOptions) {
    const shop = credentials.metadata?.shop ?? "";

    const query = `
      query CustomerOrders($first: Int!, $after: String) {
        customer {
          orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
            edges {
              node {
                id
                name
                processedAt
                totalPrice { amount currencyCode }
                subtotalPrice { amount currencyCode }
                totalTax { amount currencyCode }
                totalShippingPrice { amount currencyCode }
                lineItems(first: 50) {
                  edges {
                    node {
                      title
                      quantity
                      variant { price { amount } title }
                    }
                  }
                }
                shippingAddress { city provinceCode }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `;

    const res = await fetch(`https://${shop}/account/customer/api/2024-01/graphql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          first: options.limit ?? 25,
          after: options.cursor ?? null,
        },
      }),
    });

    if (!res.ok) throw new Error(`Shopify Customer API failed: ${res.statusText}`);
    const data = await res.json();

    const orders = data.data?.customer?.orders?.edges ?? [];
    return orders
      .map((edge: { node: ShopifyCustomerOrder }) => mapShopifyCustomerOrder(edge.node, shop))
      .filter((tx: CustomerTransaction) => {
        if (options.since && tx.transactedAt < options.since) return false;
        if (options.until && tx.transactedAt > options.until) return false;
        return true;
      });
  },

  normalizeTransaction(transaction: CustomerTransaction) {
    return {
      source: "pos" as const,
      merchant: {
        rawName: transaction.merchantName,
        canonicalName: transaction.merchantName,
        category: "Shopping",
        location: transaction.merchantLocation ?? null,
      },
      purchase: {
        purchasedAt: transaction.transactedAt.toISOString(),
        currency: transaction.currency,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        tip: 0,
        discount: transaction.discount,
        fees: transaction.shipping,
        total: transaction.total,
      },
      payment: {
        method: "shopify",
        cardId: null,
        cardLast4: null,
        walletType: null,
        entryMode: null,
      },
      items: transaction.items.map((item) => ({
        rawName: item.name,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        category: "Shopping",
      })),
      metadata: {
        confidence: 1.0,
        requiresReview: false,
      },
    };
  },
};

interface ShopifyCustomerOrder {
  id: string;
  name: string;
  processedAt: string;
  totalPrice: { amount: string; currencyCode: string };
  subtotalPrice: { amount: string; currencyCode: string };
  totalTax: { amount: string; currencyCode: string };
  totalShippingPrice: { amount: string; currencyCode: string };
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        variant?: { price: { amount: string }; title?: string };
      };
    }>;
  };
  shippingAddress?: { city?: string; provinceCode?: string };
}

function mapShopifyCustomerOrder(order: ShopifyCustomerOrder, shop: string): CustomerTransaction {
  const items = order.lineItems.edges.map(({ node }) => {
    const unitPrice = parseFloat(node.variant?.price.amount ?? "0");
    return {
      name: node.variant?.title ? `${node.title} - ${node.variant.title}` : node.title,
      quantity: node.quantity,
      unitPrice,
      totalPrice: unitPrice * node.quantity,
    };
  });

  return {
    id: order.id,
    provider: "shopify-customer",
    rawData: order,
    merchantName: shop.replace(".myshopify.com", ""),
    merchantLocation: order.shippingAddress
      ? [order.shippingAddress.city, order.shippingAddress.provinceCode].filter(Boolean).join(", ")
      : undefined,
    items,
    subtotal: parseFloat(order.subtotalPrice.amount),
    tax: parseFloat(order.totalTax.amount),
    tip: 0,
    shipping: parseFloat(order.totalShippingPrice.amount),
    discount: 0,
    total: parseFloat(order.totalPrice.amount),
    currency: order.totalPrice.currencyCode,
    status: "completed",
    transactedAt: new Date(order.processedAt),
  };
}
