import type {
  CustomerConnector,
  CustomerCredentials,
  FetchTransactionsOptions,
  CustomerTransaction,
} from "./types";

const PAYPAL_BASE_URL = process.env.PAYPAL_SANDBOX === "true"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

export const paypalConnector: CustomerConnector = {
  id: "paypal",
  name: "PayPal",
  description: "Import purchases from your PayPal transaction history",
  icon: "paypal",

  getAuthUrl(redirectUri: string, state: string) {
    const params = new URLSearchParams({
      client_id: process.env.PAYPAL_CLIENT_ID!,
      response_type: "code",
      scope: "openid https://uri.paypal.com/services/reporting/search/read",
      redirect_uri: redirectUri,
      state,
    });
    return `${PAYPAL_BASE_URL}/signin/authorize?${params}`;
  },

  async exchangeCode(code: string, redirectUri: string) {
    const basicAuth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) throw new Error(`PayPal OAuth failed: ${res.statusText}`);
    const data = await res.json();

    const userInfo = await fetchUserInfo(data.access_token);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      accountId: userInfo.payer_id ?? "",
      email: userInfo.email,
    };
  },

  async refreshToken(credentials: CustomerCredentials) {
    const basicAuth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credentials.refreshToken,
      }),
    });

    if (!res.ok) throw new Error(`PayPal token refresh failed: ${res.statusText}`);
    const data = await res.json();

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? credentials.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async fetchTransactions(credentials: CustomerCredentials, options: FetchTransactionsOptions) {
    const startDate = (options.since ?? new Date(Date.now() - 30 * 86400000)).toISOString();
    const endDate = (options.until ?? new Date()).toISOString();

    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      page_size: String(options.limit ?? 50),
      transaction_status: "S",
      fields: "all",
    });

    if (options.cursor) params.set("page", options.cursor);

    const res = await fetch(
      `${PAYPAL_BASE_URL}/v1/reporting/transactions?${params}`,
      {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) throw new Error(`PayPal transactions fetch failed: ${res.statusText}`);
    const data = await res.json();

    return (data.transaction_details ?? [])
      .filter((t: PayPalTransaction) => t.transaction_info.transaction_event_code === "T0006")
      .map(mapPayPalTransaction);
  },

  normalizeTransaction(transaction: CustomerTransaction) {
    return {
      source: "processor" as const,
      merchant: {
        rawName: transaction.merchantName,
        canonicalName: transaction.merchantName,
        category: "Uncategorized",
        location: transaction.merchantLocation ?? null,
      },
      purchase: {
        purchasedAt: transaction.transactedAt.toISOString(),
        currency: transaction.currency,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        tip: transaction.tip,
        discount: transaction.discount,
        fees: transaction.shipping,
        total: transaction.total,
      },
      payment: {
        method: "paypal",
        cardId: null,
        cardLast4: transaction.cardLast4 ?? null,
        walletType: "paypal",
        entryMode: null,
      },
      items: transaction.items.map((item) => ({
        rawName: item.name,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        category: item.category ?? "Uncategorized",
      })),
      metadata: {
        confidence: 0.9,
        requiresReview: false,
      },
    };
  },
};

async function fetchUserInfo(accessToken: string) {
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return { payer_id: "", email: "" };
  return res.json();
}

interface PayPalTransaction {
  transaction_info: {
    transaction_id: string;
    transaction_event_code: string;
    transaction_amount: { value: string; currency_code: string };
    fee_amount?: { value: string };
    shipping_amount?: { value: string };
    transaction_date: string;
    transaction_status: string;
  };
  payer_info?: {
    payer_name?: { alternate_full_name: string };
    email_address?: string;
  };
  cart_info?: {
    item_details?: Array<{
      item_name: string;
      item_quantity: string;
      item_unit_price: { value: string };
      item_amount: { value: string };
      tax_amounts?: Array<{ tax_amount: { value: string } }>;
    }>;
  };
  shipping_info?: {
    name?: string;
    address?: { city?: string; state?: string };
  };
}

function mapPayPalTransaction(tx: PayPalTransaction): CustomerTransaction {
  const info = tx.transaction_info;
  const total = Math.abs(parseFloat(info.transaction_amount.value));
  const shipping = info.shipping_amount ? Math.abs(parseFloat(info.shipping_amount.value)) : 0;

  const items = (tx.cart_info?.item_details ?? []).map((item) => {
    const qty = parseInt(item.item_quantity) || 1;
    const unitPrice = Math.abs(parseFloat(item.item_unit_price.value));
    return {
      name: item.item_name,
      quantity: qty,
      unitPrice,
      totalPrice: Math.abs(parseFloat(item.item_amount.value)),
    };
  });

  const tax = (tx.cart_info?.item_details ?? []).reduce((sum, item) => {
    return sum + (item.tax_amounts ?? []).reduce((t, ta) =>
      t + Math.abs(parseFloat(ta.tax_amount.value)), 0);
  }, 0);

  const subtotal = items.length > 0
    ? items.reduce((s, i) => s + i.totalPrice, 0)
    : total - tax - shipping;

  const merchantName = tx.payer_info?.payer_name?.alternate_full_name ?? "PayPal Merchant";
  const location = tx.shipping_info?.address
    ? [tx.shipping_info.address.city, tx.shipping_info.address.state].filter(Boolean).join(", ")
    : undefined;

  return {
    id: info.transaction_id,
    provider: "paypal",
    rawData: tx,
    merchantName,
    merchantLocation: location,
    items,
    subtotal,
    tax,
    tip: 0,
    shipping,
    discount: 0,
    total,
    currency: info.transaction_amount.currency_code,
    status: "completed",
    transactedAt: new Date(info.transaction_date),
  };
}
