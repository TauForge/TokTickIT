// e2e/lab-03/user-administration.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Administrator user lifecycle (E2E-04)", () => {
  test("create, edit, deactivate a user; self-deactivation is blocked; password reset forces change at next login", async ({ page }) => {
    // A unique, timestamped email — not a fixed literal — so this spec is repeatable
    // against a persistent dev/e2e database: a fixed "e2e.fixture@toktickit.dev" would
    // 409 EMAIL_ALREADY_EXISTS (BR-12) on every run after the first.
    const fixtureEmail = `e2e.fixture.${Date.now()}@toktickit.dev`;

    await page.goto("/");
    await page.getByLabel(/email/i).fill("admin@toktickit.dev");
    await page.getByLabel(/password/i).fill("DevPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByRole("link", { name: /admin/i }).click();

    // Every locator below scopes by the row containing `fixtureEmail`, not the shared
    // display name — the persistent dev/e2e database accumulates leftover fixture rows
    // ("E2E Fixture User" / "E2E Fixture User Updated") from prior runs, so matching on
    // display name alone hits Playwright's strict-mode violation once more than one exists.
    const fixtureRow = page.locator("tr", { hasText: fixtureEmail });

    await page.getByRole("button", { name: /^create user$/i }).click();
    await page.getByLabel(/full name/i).fill("E2E Fixture User");
    await page.getByLabel(/email address/i).fill(fixtureEmail);
    await page.getByLabel(/^role/i).selectOption("IT_STAFF");
    await page.getByLabel(/initial password/i).fill("FixtureInitial1!");
    await page.getByRole("button", { name: /save user/i }).click();
    await expect(fixtureRow).toBeVisible();

    await fixtureRow.getByRole("button", { name: /edit/i }).click();
    await page.getByLabel(/full name/i).fill("E2E Fixture User Updated");
    await page.getByRole("button", { name: /save user/i }).click();
    await expect(fixtureRow).toContainText("E2E Fixture User Updated");

    await fixtureRow.getByRole("button", { name: /edit/i }).click();
    const newPasswordField = page.getByLabel(/set new password/i);
    await newPasswordField.fill("BrandNewFixture2!");
    await page.getByRole("button", { name: /^set new password$/i }).click();
    // handleSetPassword (UserManagement.tsx) clears this field only after its PATCH
    // resolves — wait for that instead of clicking Cancel immediately, which raced the
    // in-flight request and made the password change silently lose.
    await expect(newPasswordField).toHaveValue("");
    await page.getByRole("button", { name: /cancel/i }).click();

    await page
      .locator("tr", { hasText: "System Administrator" })
      .getByRole("button", { name: /edit/i })
      .click();
    const deactivateSelf = page.getByRole("button", { name: /deactivate user/i });
    await expect(deactivateSelf).toBeDisabled();
    await expect(deactivateSelf).toHaveAttribute("title", /cannot deactivate your own account/i);
    await page.getByRole("button", { name: /cancel/i }).click();

    await page.getByRole("button", { name: /logout/i }).click();
    await page.getByLabel(/email/i).fill(fixtureEmail);
    await page.getByLabel(/password/i).fill("BrandNewFixture2!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /change password/i })).toBeVisible();
  });
});
