import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

/**
 * GET /api/mcp
 *
 * MCP Server Manifest - describes available tools, auth configuration,
 * and capabilities for AI agents connecting via Model Context Protocol.
 */
export async function GET(req: NextRequest) {
  const requestId = randomUUID();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://receiptiles.com";

  const manifest = {
    name: "receiptiles",
    version: "1.0.0",
    description:
      "Access customer receipts and merchant analytics with user consent",
    auth: {
      type: "oauth2",
      authorization_url: `${baseUrl}/oauth/consent`,
      token_url: `${baseUrl}/api/oauth/token`,
      scopes: {
        "receipts:read": "Read customer receipts and purchase history",
        "receipts:write": "Create/upload receipts on behalf of user",
        "analytics:read": "Access spending analytics and insights",
        "merchant:read": "Read merchant transaction data",
        "merchant:analytics": "Access merchant sales analytics",
        "profile:read": "Read basic user profile",
      },
    },
    tools: [
      {
        name: "list_receipts",
        description:
          "List and search user receipts with filtering by merchant, date range, and amount",
        endpoint: `${baseUrl}/api/mcp/tools/receipts`,
        method: "GET",
        scope: "receipts:read",
        parameters: {
          limit: {
            type: "integer",
            description: "Number of receipts to return (max 100)",
            default: 20,
          },
          offset: {
            type: "integer",
            description: "Offset for pagination",
            default: 0,
          },
          merchant: {
            type: "string",
            description: "Filter by merchant name (partial match)",
          },
          dateFrom: {
            type: "string",
            format: "date",
            description: "Filter receipts from this date (ISO 8601)",
          },
          dateTo: {
            type: "string",
            format: "date",
            description: "Filter receipts up to this date (ISO 8601)",
          },
          minAmount: {
            type: "integer",
            description: "Minimum total amount in cents",
          },
          maxAmount: {
            type: "integer",
            description: "Maximum total amount in cents",
          },
        },
      },
      {
        name: "get_receipt",
        description:
          "Get a single receipt with full details including all line items and merchant info",
        endpoint: `${baseUrl}/api/mcp/tools/receipt/{id}`,
        method: "GET",
        scope: "receipts:read",
        parameters: {
          id: {
            type: "string",
            description: "Receipt ID",
            required: true,
          },
        },
      },
      {
        name: "spending_analytics",
        description:
          "Get aggregated spending analytics grouped by merchant, category, or time period",
        endpoint: `${baseUrl}/api/mcp/tools/analytics`,
        method: "GET",
        scope: "analytics:read",
        parameters: {
          period: {
            type: "string",
            enum: ["week", "month", "year"],
            description: "Time period for analytics",
            default: "month",
          },
          groupBy: {
            type: "string",
            enum: ["merchant", "category", "day"],
            description: "How to group the spending data",
            default: "category",
          },
        },
      },
      {
        name: "merchant_receipts",
        description:
          "List receipts issued by a merchant (for merchant-authenticated users)",
        endpoint: `${baseUrl}/api/mcp/tools/merchant/receipts`,
        method: "GET",
        scope: "merchant:read",
        parameters: {
          limit: {
            type: "integer",
            description: "Number of receipts to return (max 100)",
            default: 20,
          },
          offset: {
            type: "integer",
            description: "Offset for pagination",
            default: 0,
          },
          dateFrom: {
            type: "string",
            format: "date",
            description: "Filter from this date (ISO 8601)",
          },
          dateTo: {
            type: "string",
            format: "date",
            description: "Filter up to this date (ISO 8601)",
          },
        },
      },
      {
        name: "merchant_analytics",
        description:
          "Get merchant sales analytics including revenue, customer count, and top items",
        endpoint: `${baseUrl}/api/mcp/tools/merchant/analytics`,
        method: "GET",
        scope: "merchant:analytics",
        parameters: {
          period: {
            type: "string",
            enum: ["week", "month", "year"],
            description: "Time period for analytics",
            default: "month",
          },
        },
      },
    ],
    rate_limit: {
      requests_per_minute: 100,
      description: "Rate limited to 100 requests per minute per token",
    },
    pagination: {
      type: "offset",
      description: "Uses offset/limit pagination. Max limit is 100.",
    },
    formats: {
      dates: "ISO 8601 (e.g., 2026-01-15T10:30:00Z)",
      amounts: "Integer cents (e.g., 1299 = $12.99)",
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "x-request-id": requestId,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
