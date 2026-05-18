import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("@receipts/db", () => ({
  db: {
    waitlistEntry: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock the email module
vi.mock("@/lib/email/waitlist-confirmation", () => ({
  sendWaitlistConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "@receipts/db";
import { POST } from "@/app/api/waitlist/route";

function createMockRequest(body: Record<string, unknown>, headers?: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as unknown as Request;
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.waitlistEntry.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (db.waitlistEntry.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "test-id-123",
      email: "user@example.com",
      source: "landing",
      createdAt: new Date(),
    });
    (db.waitlistEntry.count as ReturnType<typeof vi.fn>).mockResolvedValue(25);
  });

  it("should successfully add an email to the waitlist", async () => {
    const req = createMockRequest({ email: "user@example.com", source: "landing" });

    const response = await POST(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBe("test-id-123");
    expect(data.remaining).toBe(75);
    expect(db.waitlistEntry.upsert).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      update: {},
      create: { email: "user@example.com", source: "landing" },
    });
  });

  it("should reject requests with an invalid email", async () => {
    const req = createMockRequest({ email: "not-an-email" });

    const response = await POST(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Valid email required");
  });

  it("should reject requests with an empty email", async () => {
    const req = createMockRequest({ email: "" });

    const response = await POST(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Valid email required");
  });

  it("should silently accept honeypot submissions without writing to database", async () => {
    const req = createMockRequest({
      email: "bot@spam.com",
      source: "landing",
      website: "http://spam-site.com",
    });

    const response = await POST(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.id).toBe("fake");
    expect(db.waitlistEntry.upsert).not.toHaveBeenCalled();
  });

  it("should rate limit excessive requests from the same IP", async () => {
    const ip = "192.168.1.100";

    // Make 6 requests (limit is 5 per minute)
    for (let i = 0; i < 6; i++) {
      const req = createMockRequest(
        { email: `user${i}@example.com` },
        { "x-forwarded-for": ip }
      );
      const response = await POST(req as any);

      if (i < 5) {
        expect(response.status).toBe(200);
      } else {
        const data = await response.json();
        expect(response.status).toBe(429);
        expect(data.error).toContain("Too many requests");
      }
    }
  });

  it("should normalize email to lowercase", async () => {
    const req = createMockRequest({ email: "  User@Example.COM  " });

    await POST(req as any);

    expect(db.waitlistEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "user@example.com" },
        create: expect.objectContaining({ email: "user@example.com" }),
      })
    );
  });
});
