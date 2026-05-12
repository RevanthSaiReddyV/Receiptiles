import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("shows login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("shows signup page", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /sign up|create account/i })).toBeVisible();
  });

  test("rejects invalid login credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("invalid@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show an error message
    await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("login form validates email format", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("not-an-email");
    await page.getByLabel(/password/i).fill("somepassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // The form should not navigate away
    await expect(page).toHaveURL(/login/);
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("signup then login flow", async ({ page }) => {
    const email = `e2e-${Date.now()}@test.local`;
    const password = "Test1234!@#$";

    // Sign up
    await page.goto("/signup");
    await page.getByLabel(/name/i).fill("E2E Test User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /sign up|create/i }).click();

    // Should redirect to dashboard or login
    await page.waitForURL(/dashboard|login/, { timeout: 10000 });

    // If redirected to login, sign in
    if (page.url().includes("login")) {
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page.getByRole("button", { name: /sign in/i }).click();
      await page.waitForURL(/dashboard/, { timeout: 10000 });
    }

    await expect(page).toHaveURL(/dashboard/);
  });
});
