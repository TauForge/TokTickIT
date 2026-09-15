// e2e/lab-03/visual-states.spec.ts
import { test, expect, request as playwrightRequest } from "@playwright/test";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1024 },
  mobile: { width: 390, height: 844 },
};

// Matches client/src/api/apiClient.ts's apiBaseUrl default — the client always calls the
// API on its own origin, not through a Vite proxy, so this setup context must too.
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? "http://localhost:3000";

// The seed only creates users/categories/related systems, never tickets — the staff queue
// is empty on a fresh DB with nothing to click into for the detail-screen screenshot, so
// this creates one fixture ticket up front for every viewport iteration to share.
async function ensureAQueuedTicketExists() {
  const setupApi = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
  const requesterLogin = await setupApi.post("/api/v1/auth/login", { data: { email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" } });
  const requesterCookies = requesterLogin.headers()["set-cookie"];
  const categoriesResponse = await setupApi.get("/api/categories");
  const categoryId = (await categoriesResponse.json())[0].id;
  await setupApi.post("/api/v1/tickets", {
    headers: { Cookie: requesterCookies ?? "" },
    data: { summary: "Visual verification fixture", description: "Created so the staff queue/detail screens have something to render.", categoryId, requestedPriority: "LOW" },
  });
  await setupApi.dispose();
}

test.beforeAll(async () => {
  await ensureAQueuedTicketExists();
});

function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  return Promise.all([
    page.evaluate(() => document.documentElement.scrollWidth),
    page.evaluate(() => document.documentElement.clientWidth),
  ]).then(([scrollWidth, clientWidth]) => {
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
}

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test(`authentication screen at ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `../artifacts/lab-03/screenshots/authentication/${name}.png`, fullPage: true });
  });

  test(`staff queue screen at ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.getByLabel(/email/i).fill("amy.tran@toktickit.dev");
    await page.getByLabel(/password/i).fill("DevPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByRole("link", { name: /my queue/i }).click();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `../artifacts/lab-03/screenshots/staff-queue/${name}.png`, fullPage: true });
  });

  test(`staff ticket detail screen at ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.getByLabel(/email/i).fill("amy.tran@toktickit.dev");
    await page.getByLabel(/password/i).fill("DevPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByRole("link", { name: /my queue/i }).click();
    await page.locator("table.zg-table a").first().click();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `../artifacts/lab-03/screenshots/staff-ticket-detail/${name}.png`, fullPage: true });
  });

  test(`user management screen at ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.getByLabel(/email/i).fill("admin@toktickit.dev");
    await page.getByLabel(/password/i).fill("DevPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByRole("link", { name: /admin/i }).click();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `../artifacts/lab-03/screenshots/user-management/${name}.png`, fullPage: true });
  });
}
