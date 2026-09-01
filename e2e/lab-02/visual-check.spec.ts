import { test, expect } from "@playwright/test";

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1024 },
  mobile: { width: 390, height: 844 },
};

async function selectFirstRequesterAndCreateTicket(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/");
  await page.getByLabel(/development requester/i).selectOption({ index: 1 });
  await page.getByRole("button", { name: /continue/i }).click();
  await page.goto("/tickets/new");
  await page.getByLabel(/^summary/i).fill("Visual-check seed ticket");
  await page.getByLabel(/description/i).fill("Created only so Ticket Detail has something to screenshot.");
  await page.getByLabel(/^category/i).selectOption({ index: 1 });
  await page.getByLabel(/requested priority/i).selectOption("LOW");
  await page.getByRole("button", { name: /submit/i }).click();
  await page.waitForURL(/\/tickets\/(?!new)[^/]+$/);
  return page.url();
}

function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  return Promise.all([
    page.evaluate(() => document.documentElement.scrollWidth),
    page.evaluate(() => document.documentElement.clientWidth),
  ]).then(([scrollWidth, clientWidth]) => {
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
}

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test(`create ticket screen at ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.getByLabel(/development requester/i).selectOption({ index: 1 });
    await page.getByRole("button", { name: /continue/i }).click();
    await page.goto("/tickets/new");
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `../artifacts/lab-02/screenshots/create-ticket/${name}.png`, fullPage: true });
  });

  test(`my tickets screen at ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.getByLabel(/development requester/i).selectOption({ index: 1 });
    await page.getByRole("button", { name: /continue/i }).click();
    await page.goto("/tickets");
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `../artifacts/lab-02/screenshots/my-tickets/${name}.png`, fullPage: true });
  });

  test(`ticket detail screen at ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    const detailUrl = await selectFirstRequesterAndCreateTicket(page);
    await page.goto(detailUrl);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `../artifacts/lab-02/screenshots/ticket-detail/${name}.png`, fullPage: true });
  });
}
