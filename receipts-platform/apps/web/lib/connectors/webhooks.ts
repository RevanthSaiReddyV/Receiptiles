const isSandbox = process.env.SQUARE_APP_ID?.startsWith("sandbox-");
const SQUARE_API = isSandbox
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";
const SQUARE_VERSION = "2024-01-18";

/**
 * Register a webhook subscription with the POS provider.
 * Called automatically when a merchant connects their POS account.
 */
export async function registerWebhook(
  provider: string,
  accessToken: string,
  webhookUrl: string,
  merchantId: string
): Promise<void> {
  switch (provider) {
    case "square":
      return registerSquareWebhook(accessToken, webhookUrl);
    case "clover":
      return registerCloverWebhook(accessToken, webhookUrl, merchantId);
    case "toast":
      // Toast webhooks are configured in their partner portal, not via API
      console.log("[Webhook] Toast webhooks must be configured in partner portal");
      return;
    case "shopify":
      return registerShopifyWebhook(accessToken, webhookUrl, merchantId);
    default:
      console.warn(`[Webhook] No webhook registration for provider: ${provider}`);
  }
}

async function registerSquareWebhook(accessToken: string, webhookUrl: string) {
  // List existing subscriptions to avoid duplicates
  const listRes = await fetch(`${SQUARE_API}/v2/webhooks/subscriptions`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": SQUARE_VERSION,
    },
  });

  if (listRes.ok) {
    const data = await listRes.json();
    const existing = (data.subscriptions ?? []).find(
      (s: { notification_url: string }) => s.notification_url === webhookUrl
    );
    if (existing) {
      console.log("[Square] Webhook already registered");
      return;
    }
  }

  const res = await fetch(`${SQUARE_API}/v2/webhooks/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify({
      idempotency_key: `receipts-${Date.now()}`,
      subscription: {
        name: "Receipts Platform",
        notification_url: webhookUrl,
        event_types: [
          "payment.completed",
          "payment.updated",
          "order.fulfillment.updated",
        ],
        api_version: SQUARE_VERSION,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Square webhook registration failed: ${err}`);
  }

  const result = await res.json();
  console.log("[Square] Webhook registered:", result.subscription?.id);
}

async function registerCloverWebhook(accessToken: string, webhookUrl: string, merchantId: string) {
  const res = await fetch(`https://api.clover.com/v3/merchants/${merchantId}/apps/${process.env.CLOVER_APP_ID}/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: webhookUrl,
      events: ["PAYMENT_PROCESSED", "ORDER_CREATED"],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Clover webhook registration failed: ${err}`);
  }
}

async function registerShopifyWebhook(accessToken: string, webhookUrl: string, shopDomain: string) {
  const res = await fetch(`https://${shopDomain}/admin/api/2024-01/webhooks.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      webhook: {
        topic: "orders/paid",
        address: webhookUrl,
        format: "json",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Shopify webhook registration failed: ${err}`);
  }
}
