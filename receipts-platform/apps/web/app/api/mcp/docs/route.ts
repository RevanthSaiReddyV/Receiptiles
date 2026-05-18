import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * GET /api/mcp/docs
 *
 * Developer documentation for the Receiptiles MCP API.
 * Returns HTML documentation page.
 */
export async function GET(req: NextRequest) {
  const requestId = randomUUID();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://receiptiles.com";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receiptiles MCP API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      background: #fafbfc;
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #0f172a; }
    h2 { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 1rem; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h3 { font-size: 1.1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #334155; }
    p { margin-bottom: 1rem; color: #475569; }
    code {
      background: #f1f5f9;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1.25rem;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 1.5rem;
      font-size: 0.8rem;
      line-height: 1.5;
    }
    pre code { background: none; padding: 0; color: inherit; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-get { background: #dcfce7; color: #166534; }
    .badge-post { background: #dbeafe; color: #1e40af; }
    .badge-scope { background: #fef3c7; color: #92400e; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #334155; }
    .endpoint { margin-bottom: 2rem; padding: 1.5rem; background: white; border-radius: 8px; border: 1px solid #e2e8f0; }
    .endpoint-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .endpoint-path { font-family: monospace; font-weight: 600; font-size: 0.95rem; }
    .subtitle { color: #64748b; font-size: 1.1rem; margin-bottom: 2rem; }
    .note { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 1rem; border-radius: 0 4px 4px 0; margin-bottom: 1.5rem; }
    .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 1rem; border-radius: 0 4px 4px 0; margin-bottom: 1.5rem; }
    ul { padding-left: 1.5rem; margin-bottom: 1rem; }
    li { margin-bottom: 0.5rem; color: #475569; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Receiptiles MCP API</h1>
  <p class="subtitle">Model Context Protocol server for AI agents to access customer receipts and merchant analytics</p>

  <div class="note">
    <strong>MCP Manifest:</strong> <code>GET ${baseUrl}/api/mcp</code> returns the full machine-readable manifest with tool definitions.
  </div>

  <h2>1. Getting Started</h2>

  <h3>Register Your Agent/App</h3>
  <ol>
    <li>Sign up at <a href="${baseUrl}/developers">${baseUrl}/developers</a></li>
    <li>Create a new application to get your <code>client_id</code> and <code>client_secret</code></li>
    <li>Configure your redirect URI for the OAuth callback</li>
    <li>Select the scopes your agent needs</li>
  </ol>

  <h3>Available Scopes</h3>
  <table>
    <thead><tr><th>Scope</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>receipts:read</code></td><td>Read customer receipts and purchase history</td></tr>
      <tr><td><code>receipts:write</code></td><td>Create/upload receipts on behalf of user</td></tr>
      <tr><td><code>analytics:read</code></td><td>Access spending analytics and insights</td></tr>
      <tr><td><code>merchant:read</code></td><td>Read merchant transaction data</td></tr>
      <tr><td><code>merchant:analytics</code></td><td>Access merchant sales analytics</td></tr>
      <tr><td><code>profile:read</code></td><td>Read basic user profile</td></tr>
    </tbody>
  </table>

  <h2>2. Authentication Flow</h2>

  <h3>Step 1: Redirect User to Consent</h3>
  <pre><code>GET ${baseUrl}/api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://your-app.com/callback
  &scope=receipts:read analytics:read
  &state=random_state_value
  &response_type=code</code></pre>

  <h3>Step 2: Exchange Code for Token</h3>
  <pre><code>POST ${baseUrl}/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "rc_...",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://your-app.com/callback"
}</code></pre>

  <h3>Step 3: Response</h3>
  <pre><code>{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJ...",
  "scope": "receipts:read analytics:read"
}</code></pre>

  <h3>Step 4: Use Token in Requests</h3>
  <pre><code>GET ${baseUrl}/api/mcp/tools/receipts?limit=10
Authorization: Bearer eyJ...
</code></pre>

  <h2>3. MCP Protocol Connection</h2>

  <p>To connect via MCP protocol, configure your AI agent with:</p>
  <pre><code>{
  "mcpServers": {
    "receiptiles": {
      "url": "${baseUrl}/api/mcp",
      "auth": {
        "type": "oauth2",
        "client_id": "YOUR_CLIENT_ID",
        "client_secret": "YOUR_CLIENT_SECRET",
        "authorization_url": "${baseUrl}/api/oauth/authorize",
        "token_url": "${baseUrl}/api/oauth/token",
        "scopes": ["receipts:read", "analytics:read"]
      }
    }
  }
}</code></pre>

  <h2>4. API Tools Reference</h2>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/mcp/tools/receipts</span>
      <span class="badge badge-scope">receipts:read</span>
    </div>
    <p>List and search receipts with filtering by merchant, date range, and amount.</p>
    <table>
      <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>limit</code></td><td>integer</td><td>Results per page (default: 20, max: 100)</td></tr>
        <tr><td><code>offset</code></td><td>integer</td><td>Pagination offset (default: 0)</td></tr>
        <tr><td><code>merchant</code></td><td>string</td><td>Filter by merchant name (partial match)</td></tr>
        <tr><td><code>dateFrom</code></td><td>string</td><td>ISO 8601 start date</td></tr>
        <tr><td><code>dateTo</code></td><td>string</td><td>ISO 8601 end date</td></tr>
        <tr><td><code>minAmount</code></td><td>integer</td><td>Min total in cents</td></tr>
        <tr><td><code>maxAmount</code></td><td>integer</td><td>Max total in cents</td></tr>
      </tbody>
    </table>
    <h3>Example Response</h3>
    <pre><code>{
  "data": [
    {
      "id": "clx...",
      "merchant": {
        "name": "Trader Joe's",
        "category": "Groceries",
        "location": "San Francisco, CA"
      },
      "purchasedAt": "2026-05-15T14:30:00.000Z",
      "currency": "USD",
      "subtotal": 4523,
      "tax": 389,
      "total": 4912,
      "paymentMethod": "credit_card",
      "cardLast4": "4242",
      "source": "EMAIL",
      "items": [
        {
          "id": "clx...",
          "name": "Organic Bananas",
          "quantity": 1,
          "unitPrice": 149,
          "totalPrice": 149,
          "category": "Produce"
        }
      ]
    }
  ],
  "pagination": {
    "total": 142,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}</code></pre>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/mcp/tools/receipt/{id}</span>
      <span class="badge badge-scope">receipts:read</span>
    </div>
    <p>Get a single receipt with full details including all line items, payment info, and metadata.</p>
    <table>
      <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>id</code></td><td>string</td><td>Receipt ID (path parameter, required)</td></tr>
      </tbody>
    </table>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/mcp/tools/analytics</span>
      <span class="badge badge-scope">analytics:read</span>
    </div>
    <p>Get aggregated spending analytics grouped by merchant, category, or day.</p>
    <table>
      <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>period</code></td><td>string</td><td>Time period: week, month, year (default: month)</td></tr>
        <tr><td><code>groupBy</code></td><td>string</td><td>Grouping: merchant, category, day (default: category)</td></tr>
      </tbody>
    </table>
    <h3>Example Response</h3>
    <pre><code>{
  "data": {
    "period": "month",
    "groupBy": "category",
    "dateFrom": "2026-04-18T00:00:00.000Z",
    "dateTo": "2026-05-18T00:00:00.000Z",
    "summary": {
      "totalSpentCents": 245800,
      "transactionCount": 47,
      "averageTransactionCents": 5229,
      "uniqueMerchants": 12
    },
    "groups": [
      {
        "label": "Groceries",
        "totalCents": 89500,
        "transactionCount": 12,
        "averageCents": 7458,
        "minCents": 1299,
        "maxCents": 18750
      }
    ]
  }
}</code></pre>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/mcp/tools/merchant/receipts</span>
      <span class="badge badge-scope">merchant:read</span>
    </div>
    <p>List receipts issued by the authenticated merchant. Requires an active merchant/POS connection.</p>
    <table>
      <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>limit</code></td><td>integer</td><td>Results per page (default: 20, max: 100)</td></tr>
        <tr><td><code>offset</code></td><td>integer</td><td>Pagination offset (default: 0)</td></tr>
        <tr><td><code>dateFrom</code></td><td>string</td><td>ISO 8601 start date</td></tr>
        <tr><td><code>dateTo</code></td><td>string</td><td>ISO 8601 end date</td></tr>
      </tbody>
    </table>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/mcp/tools/merchant/analytics</span>
      <span class="badge badge-scope">merchant:analytics</span>
    </div>
    <p>Get merchant sales analytics: revenue, customer count, average ticket, and top-selling items.</p>
    <table>
      <thead><tr><th>Parameter</th><th>Type</th><th>Description</th></tr></thead>
      <tbody>
        <tr><td><code>period</code></td><td>string</td><td>Time period: week, month, year (default: month)</td></tr>
      </tbody>
    </table>
    <h3>Example Response</h3>
    <pre><code>{
  "data": {
    "merchant": { "id": "sq_abc123", "name": "Blue Bottle Coffee", "provider": "square" },
    "period": "month",
    "summary": {
      "totalRevenueCents": 1250000,
      "totalTaxCents": 98750,
      "totalTipsCents": 187500,
      "totalDiscountCents": 15000,
      "transactionCount": 834,
      "uniqueCustomers": 412,
      "averageTicketCents": 1499
    },
    "topItemsByRevenue": [
      { "name": "Oat Milk Latte", "quantitySold": 523, "revenueCents": 314500 }
    ],
    "dailyBreakdown": [
      { "date": "2026-05-01", "revenueCents": 45200, "transactionCount": 28 }
    ]
  }
}</code></pre>
  </div>

  <h2>5. Error Handling</h2>

  <p>All errors return a consistent JSON format:</p>
  <pre><code>{
  "error": "Human-readable error message",
  "code": "machine_readable_code"
}</code></pre>

  <table>
    <thead><tr><th>HTTP Status</th><th>Code</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td>400</td><td><code>invalid_request</code></td><td>Missing or invalid parameters</td></tr>
      <tr><td>401</td><td><code>auth_required</code></td><td>No authorization token provided</td></tr>
      <tr><td>401</td><td><code>invalid_token</code></td><td>Token is invalid or malformed</td></tr>
      <tr><td>401</td><td><code>token_expired</code></td><td>Token has expired, use refresh token</td></tr>
      <tr><td>403</td><td><code>insufficient_scope</code></td><td>Token lacks the required scope</td></tr>
      <tr><td>403</td><td><code>grant_revoked</code></td><td>User revoked access to your app</td></tr>
      <tr><td>404</td><td><code>not_found</code></td><td>Resource does not exist</td></tr>
      <tr><td>429</td><td><code>rate_limited</code></td><td>Exceeded 100 requests/minute</td></tr>
      <tr><td>500</td><td><code>internal_error</code></td><td>Server error, try again later</td></tr>
    </tbody>
  </table>

  <h2>6. Rate Limits</h2>

  <div class="note">
    <strong>100 requests per minute</strong> per access token. When exceeded, you'll receive a 429 response.
    All responses include an <code>x-request-id</code> header for debugging.
  </div>

  <h2>7. Data Formats</h2>

  <ul>
    <li><strong>Dates:</strong> ISO 8601 format (e.g., <code>2026-05-18T14:30:00.000Z</code>)</li>
    <li><strong>Amounts:</strong> Integer cents to avoid floating point issues (e.g., <code>1299</code> = $12.99)</li>
    <li><strong>IDs:</strong> CUID format strings</li>
    <li><strong>Pagination:</strong> Offset/limit pattern with <code>hasMore</code> indicator</li>
  </ul>

  <h2>8. Best Practices</h2>

  <ul>
    <li>Request only the scopes you need - users are more likely to grant limited access</li>
    <li>Cache responses when appropriate - receipt data doesn't change frequently</li>
    <li>Handle token expiry gracefully - use the refresh token to get a new access token</li>
    <li>Respect rate limits - implement exponential backoff on 429 responses</li>
    <li>Use the <code>x-request-id</code> header when reporting issues</li>
  </ul>

  <hr style="margin: 2rem 0; border: none; border-top: 1px solid #e2e8f0;">
  <p style="color: #94a3b8; font-size: 0.85rem;">Receiptiles MCP API v1.0.0 | <a href="${baseUrl}/api/mcp">View Manifest</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "x-request-id": requestId,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
