// e2e/lab-03/authentication.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Authentication (E2E-01)", () => {
  test("valid login reaches the app, invalid login shows the generic error, logout blocks direct access", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill("nobody@toktickit.dev");
    await page.getByLabel(/password/i).fill("WrongPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();

    await page.getByLabel(/email/i).fill("jennifer.anderson@toktickit.dev");
    await page.getByLabel(/password/i).fill("DevPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /my tickets/i })).toBeVisible();

    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

    await page.goto("/tickets");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("an inactive user's valid password is rejected with the account-cannot-sign-in message", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill("retired.alumnus@toktickit.dev");
    await page.getByLabel(/password/i).fill("DevPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/cannot sign in right now/i)).toBeVisible();
  });
});

test.describe("Mandatory first-login password change (E2E-02)", () => {
  test("initial password login forces Change Password before the app shell is reachable", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill("onboarding@toktickit.local");
    await page.getByLabel(/password/i).fill("DevPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: /change password/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /my queue|my tickets/i })).toHaveCount(0);

    await page.getByLabel(/current password/i).fill("DevPass123!");
    await page.getByLabel(/^new password/i).fill("Onboarded456!");
    await page.getByLabel(/confirm new password/i).fill("Onboarded456!");
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByRole("heading", { name: /change password/i })).toHaveCount(0);
  });
});
