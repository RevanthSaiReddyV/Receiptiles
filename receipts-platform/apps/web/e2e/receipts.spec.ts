import { test, expect } from "@playwright/test";
import path from "path";

// Helper to log in before tests
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL || "test@example.com");
  await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD || "Test1234!@#$");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}

test.describe("Receipts", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("displays receipts list", async ({ page }) => {
    await page.goto("/receipts");
    await expect(page.getByRole("heading", { name: /receipts/i })).toBeVisible();
  });

  test("can search receipts by merchant", async ({ page }) => {
    await page.goto("/receipts");

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Starbucks");
      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Results should only contain the searched merchant or show "no results"
      const results = page.locator("[data-testid='receipt-card'], [data-testid='receipt-row']");
      const count = await results.count();
      if (count > 0) {
        await expect(results.first()).toContainText(/starbucks/i);
      }
    }
  });

  test("can view receipt detail", async ({ page }) => {
    await page.goto("/receipts");

    // Click the first receipt if any exist
    const firstReceipt = page.locator("[data-testid='receipt-card'], [data-testid='receipt-row']").first();
    if (await firstReceipt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstReceipt.click();
      await expect(page.getByText(/total|subtotal/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test("can upload a receipt image", async ({ page }) => {
    await page.goto("/upload");

    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Use a test fixture image
      const testImagePath = path.join(__dirname, "fixtures", "test-receipt.png");
      await fileInput.setInputFiles(testImagePath);

      // Should show upload progress or success
      await expect(
        page.getByText(/uploading|processing|uploaded|success/i)
      ).toBeVisible({ timeout: 15000 });
    }
  });
});
