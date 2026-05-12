import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("Public API v1", () => {
  test("returns 401 without API key", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/receipts`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("unauthorized");
  });

  test("returns 401 with invalid API key", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/receipts`, {
      headers: { Authorization: "Bearer sk_live_invalid_key_here" },
    });
    expect(response.status()).toBe(401);
  });

  test("stats endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/stats`);
    expect(response.status()).toBe(401);
  });

  test("receipts endpoint accepts query params", async ({ request }) => {
    // Even with invalid key, the request should be properly handled
    const response = await request.get(
      `${BASE_URL}/api/v1/receipts?limit=10&offset=0&merchant=test`,
      {
        headers: { Authorization: "Bearer sk_live_invalid" },
      }
    );
    // Should still be 401 (invalid key), not a 500
    expect(response.status()).toBe(401);
  });

  test("receipt by ID returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/v1/receipts/some-id`);
    expect(response.status()).toBe(401);
  });

  // Integration test (requires E2E_API_KEY env var)
  const apiKey = process.env.E2E_API_KEY;

  test.describe("with valid API key", () => {
    test.skip(!apiKey, "E2E_API_KEY not set");

    test("lists receipts", async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/v1/receipts`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toHaveProperty("total");
      expect(body.pagination).toHaveProperty("limit");
      expect(body.pagination).toHaveProperty("offset");
    });

    test("gets stats by category", async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/v1/stats?groupBy=category`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveProperty("totalSpend");
      expect(body.data).toHaveProperty("breakdown");
      expect(body.data.groupBy).toBe("category");
    });

    test("respects pagination params", async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/v1/receipts?limit=5&offset=0`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBeLessThanOrEqual(5);
      expect(body.pagination.limit).toBe(5);
    });

    test("returns 404 for non-existent receipt", async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/v1/receipts/non-existent-id`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      expect(response.status()).toBe(404);
    });
  });
});
