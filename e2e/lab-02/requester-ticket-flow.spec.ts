import { test, expect } from "@playwright/test";

// A unique suffix per run keeps these tests idempotent — Task 25 re-runs the whole suite
// against the same shared dev database, and a hard-coded summary would leave two+ rows
// matching the same search after the second run, breaking Playwright's strict-mode single-match
// assertions.
const runId = Date.now();

// Task 23's own visual-check spec caught /\/tickets\/.+/ matching /tickets/new (the page is
// already on that URL before the post-submit navigation happens, so waitForURL would resolve
// immediately without waiting for the real redirect to /tickets/<id>). Use a negative lookahead
// so this only matches the created ticket's detail URL.
const TICKET_DETAIL_URL = /\/tickets\/(?!new)[^/]+$/;

test("a requester can select an identity, create a ticket, and find it in My Tickets", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/email/i).fill("jennifer.anderson@toktickit.dev");
  await page.getByLabel(/password/i).fill("DevPass123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByRole("heading", { name: /my tickets/i }).waitFor();

  const summary = `E2E test ${runId}: laptop will not power on`;
  await page.goto("/tickets/new");
  await page.getByLabel(/^summary/i).fill(summary);
  await page.getByLabel(/description/i).fill("Held the power button for 15 seconds, no response at all.");
  await page.getByLabel(/^category/i).selectOption({ index: 1 });
  await page.getByLabel(/requested priority/i).selectOption("HIGH");
  await page.getByRole("button", { name: /submit/i }).click();

  // Task 21 Step 6 routes a successful submission straight to its Ticket Detail screen.
  await page.waitForURL(TICKET_DETAIL_URL);
  await expect(page.getByText(/TKT-\d{4}-\d{6}/)).toBeVisible();

  await page.goto("/tickets");
  // MyTickets' search field label is just "Search" (client/src/screens/MyTickets.tsx) —
  // not "search by ticket number or summary" as the brief sample assumed.
  await page.getByLabel(/^search$/i).fill(summary);
  await expect(page.getByText(summary)).toBeVisible();
});

test("requester B cannot see requester A's tickets in My Tickets", async ({ page, browser }) => {
  await page.goto("/");
  await page.getByLabel(/email/i).fill("jennifer.anderson@toktickit.dev");
  await page.getByLabel(/password/i).fill("DevPass123!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByRole("heading", { name: /my tickets/i }).waitFor();

  const summary = `E2E isolation test ${runId} for requester A`;
  await page.goto("/tickets/new");
  await page.getByLabel(/^summary/i).fill(summary);
  await page.getByLabel(/description/i).fill("This ticket must never be visible to requester B.");
  await page.getByLabel(/^category/i).selectOption({ index: 1 });
  await page.getByLabel(/requested priority/i).selectOption("LOW");
  await page.getByRole("button", { name: /submit/i }).click();
  await page.waitForURL(TICKET_DETAIL_URL);
  await expect(page.getByText(/TKT-\d{4}-\d{6}/)).toBeVisible();

  // A second BrowserContext (not context.newPage() on the same context) gets its own cookie
  // jar, so requester B's session genuinely starts unauthenticated instead of inheriting
  // requester A's session cookie.
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto("/");
  await pageB.getByLabel(/email/i).fill("michael.brown@toktickit.dev");
  await pageB.getByLabel(/password/i).fill("DevPass123!");
  await pageB.getByRole("button", { name: /sign in/i }).click();
  await pageB.getByRole("heading", { name: /my tickets/i }).waitFor();
  await pageB.goto("/tickets");
  await pageB.getByLabel(/^search$/i).fill(`E2E isolation test ${runId}`);
  await expect(pageB.getByText(/no tickets match/i)).toBeVisible();
  await contextB.close();
});
