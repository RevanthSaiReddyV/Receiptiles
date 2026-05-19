# @receiptiles/sdk

Official TypeScript SDK for the [Receiptiles](https://receiptiles.com) MCP/API platform. Query receipts, spending analytics, and merchant data with full type safety.

## Installation

```bash
npm install @receiptiles/sdk
# or
pnpm add @receiptiles/sdk
# or
yarn add @receiptiles/sdk
```

## Quick Start

### With API Key

```typescript
import { ReceiptilesClient } from "@receiptiles/sdk";

const client = new ReceiptilesClient({
  apiKey: "sk_live_your_api_key_here",
});

// List recent receipts
const { data: receipts } = await client.receipts.list({ limit: 10 });

// Get a specific receipt
const receipt = await client.receipts.get("rec_abc123");

// Get spending analytics
const analytics = await client.analytics.spending({
  period: "month",
  groupBy: "merchant",
});
```

### With OAuth2 Access Token

```typescript
import { ReceiptilesClient } from "@receiptiles/sdk";

const client = new ReceiptilesClient({
  accessToken: "access_token_from_oauth_flow",
});

const { data: receipts } = await client.receipts.list();
```

## OAuth2 Flow

The SDK provides helpers for the full OAuth2 authorization code flow:

```typescript
import { getAuthorizationUrl, exchangeCode, refreshToken } from "@receiptiles/sdk";

// Step 1: Generate the authorization URL and redirect the user
const authUrl = getAuthorizationUrl({
  clientId: "your_client_id",
  redirectUri: "https://yourapp.com/callback",
  scopes: ["receipts:read", "analytics:read"],
  state: "random_state_value",
});

// Step 2: After user authorizes, exchange the code for tokens
const tokens = await exchangeCode({
  clientId: "your_client_id",
  clientSecret: "your_client_secret",
  code: "authorization_code_from_callback",
  redirectUri: "https://yourapp.com/callback",
});

// tokens.accessToken  — use to make API requests
// tokens.refreshToken — store securely for token refresh

// Step 3: Refresh the token when it expires
const newTokens = await refreshToken({
  clientId: "your_client_id",
  clientSecret: "your_client_secret",
  refreshToken: tokens.refreshToken,
});
```

## API Reference

### `ReceiptilesClient`

```typescript
const client = new ReceiptilesClient({
  apiKey?: string;         // Direct API key (sk_...)
  accessToken?: string;    // OAuth2 access token
  baseUrl?: string;        // Default: https://receiptiles.com
  timeout?: number;        // Default: 30000ms
});
```

### Receipts

```typescript
// List receipts with filters
const response = await client.receipts.list({
  limit: 20,              // Number of results (default: 20)
  offset: 0,             // Pagination offset
  merchant: "Amazon",    // Filter by merchant name
  dateFrom: "2024-01-01", // ISO 8601 start date
  dateTo: "2024-12-31",   // ISO 8601 end date
  minAmount: 1000,       // Minimum amount in cents ($10.00)
  maxAmount: 50000,      // Maximum amount in cents ($500.00)
});

// Get a single receipt
const receipt = await client.receipts.get("rec_abc123");
```

### Analytics

```typescript
// Get spending breakdown
const spending = await client.analytics.spending({
  period: "month",                    // 'week' | 'month' | 'year'
  groupBy: "merchant",               // 'merchant' | 'category' | 'day'
});

// spending.totalSpending      — Total in cents
// spending.transactionCount   — Number of transactions
// spending.averageTransaction — Average in cents
// spending.groups             — Breakdown by groupBy dimension
```

### Merchant

For merchant-authenticated clients:

```typescript
// List merchant's receipts
const { data: receipts } = await client.merchant.receipts({
  limit: 50,
  dateFrom: "2024-01-01",
  dateTo: "2024-12-31",
});

// Get merchant analytics
const analytics = await client.merchant.analytics({
  period: "month",
});

// analytics.totalRevenue      — Total revenue in cents
// analytics.transactionCount  — Number of orders
// analytics.averageOrderValue — AOV in cents
// analytics.uniqueCustomers   — Distinct customers
// analytics.revenueByDay      — Daily breakdown
```

## TypeScript Types

All types are exported for use in your application:

```typescript
import type {
  Receipt,
  ReceiptItem,
  SpendingAnalytics,
  MerchantReceipt,
  MerchantAnalytics,
  PaginatedResponse,
  TokenResponse,
} from "@receiptiles/sdk";
```

### Key Type Notes

- **Amounts** are always in **cents** (integer). Divide by 100 for display.
- **Dates** are ISO 8601 strings (e.g., `"2024-03-15T10:30:00Z"`).
- **Currency** uses ISO 4217 codes (e.g., `"USD"`, `"EUR"`).

## Error Handling

The SDK throws typed errors that you can catch and handle:

```typescript
import {
  ReceiptilesError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
} from "@receiptiles/sdk";

try {
  const receipt = await client.receipts.get("rec_invalid");
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log("Receipt not found:", error.message);
  } else if (error instanceof AuthenticationError) {
    console.log("Invalid credentials:", error.message);
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof ReceiptilesError) {
    console.log(`API error ${error.status}: ${error.message}`);
    console.log("Request ID:", error.requestId);
  }
}
```

### Error Classes

| Class | Status | Description |
|-------|--------|-------------|
| `AuthenticationError` | 401 | Invalid or expired API key / token |
| `NotFoundError` | 404 | Resource does not exist |
| `RateLimitError` | 429 | Too many requests (includes `retryAfter`) |
| `ReceiptilesError` | * | Base class for all API errors |

## Rate Limiting

The API enforces rate limits. When exceeded, a `RateLimitError` is thrown with a `retryAfter` property indicating how many seconds to wait:

```typescript
try {
  await client.receipts.list();
} catch (error) {
  if (error instanceof RateLimitError) {
    await new Promise((resolve) => setTimeout(resolve, error.retryAfter * 1000));
    // Retry the request
  }
}
```

## MCP Integration

This SDK can be used within MCP (Model Context Protocol) tool implementations to give AI agents access to receipt data:

```typescript
import { ReceiptilesClient } from "@receiptiles/sdk";

// In your MCP server tool handler
async function handleListReceipts(params: { merchant?: string; limit?: number }) {
  const client = new ReceiptilesClient({
    apiKey: process.env.RECEIPTILES_API_KEY,
  });

  const response = await client.receipts.list({
    merchant: params.merchant,
    limit: params.limit ?? 10,
  });

  return response.data;
}
```

### Using with Claude or GPT agents

1. Register the Receiptiles MCP server in your agent configuration
2. The agent can call tools that use this SDK internally
3. Receipt data is returned in structured format for AI reasoning

```typescript
// Example: MCP tool definition for an AI agent
const tools = [
  {
    name: "get_receipts",
    description: "Retrieve the user's receipts with optional filters",
    inputSchema: {
      type: "object",
      properties: {
        merchant: { type: "string", description: "Filter by merchant name" },
        limit: { type: "number", description: "Max results to return" },
      },
    },
    handler: async (input) => {
      const client = new ReceiptilesClient({ apiKey: process.env.RECEIPTILES_API_KEY });
      return client.receipts.list(input);
    },
  },
];
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `apiKey` | — | API key starting with `sk_` |
| `accessToken` | — | OAuth2 bearer token |
| `baseUrl` | `https://receiptiles.com` | API base URL |
| `timeout` | `30000` | Request timeout in ms |

## License

MIT
