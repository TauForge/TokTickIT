// e2e/lab-04/dashboards.spec.ts (E2E-03, E2E-04, VISUAL-01)
import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  ADMIN,
  REQUESTER,
  STAFF,
  VIEWPORTS,
  addActionViaApi,
  createTicket,
  expectNoHorizontalOverflow,
  signIn,
} from "./helpers";

const SHOTS = path.resolve(__dirname, "../../artifacts/lab-04/screenshots");

test.describe("Dashboards (E2E-03)", () => {
  test("Requester dashboard shows own counts and drills down to My Tickets", async ({ page }) => {
    await createTicket(`E2E-03 requester dashboard ${Date.now()}`);
    await signIn(page, REQUESTER);
    await expect(page.getByRole("navigation", { name: /main/i }).getByRole("link", { name: /^dashboard$/i })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("metric-card-my-open")).toBeVisible();
    await expect(page.getByRole("link", { name: /create ticket/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /view all in progress tickets/i }).click();
    await expect(page).toHaveURL(/\/tickets\?status=IN_PROGRESS/);
    await expect(page.getByRole("heading", { name: /my tickets/i })).toBeVisible();
  });

  test("Staff dashboard drill-down opens the filtered queue", async ({ page }) => {
    await createTicket(`E2E-03 staff dashboard ${Date.now()}`);
    await signIn(page, STAFF, /welcome back/i);
    await expect(page.getByTestId("metric-card-new")).toBeVisible();
    await page.getByRole("link", { name: /view new tickets/i }).click();
    await expect(page).toHaveURL(/\/staff\/tickets\?status=NEW/);
    await expect(page.getByRole("heading", { name: /my queue/i })).toBeVisible();
    await expect(page.locator("table.zg-table a").first()).toBeVisible();
  });

  test("Administrator sees user counts that IT Staff do not", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signIn(admin, ADMIN, /welcome back/i);
    await expect(admin.getByTestId("metric-card-users")).toBeVisible();
    await adminContext.close();

    const staffContext = await browser.newContext();
    const staff = await staffContext.newPage();
    await signIn(staff, STAFF, /welcome back/i);
    await expect(staff.getByTestId("metric-card-users")).toHaveCount(0);
    await staffContext.close();
  });

  test("Staff can create a ticket for themselves from the dashboard", async ({ page }) => {
    await signIn(page, STAFF, /welcome back/i);
    await page.getByRole("link", { name: /create ticket/i }).first().click();
    await page.getByLabel(/^summary/i).fill(`E2E staff created ${Date.now()}`);
    await page.getByLabel(/description/i).fill("Staff-created ticket from the quick action.");
    await page.getByLabel(/^category/i).selectOption({ index: 1 });
    await page.getByLabel(/requested priority/i).selectOption("LOW");
    await page.getByRole("button", { name: /submit/i }).click();
    await expect(page).toHaveURL(/\/staff\/tickets\/(?!new)[^/]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/TKT-\d{4}-\d{6}/);
  });
});

test.describe("Lab 1-3 regression (E2E-04)", () => {
  test("login, My Tickets, comment, attachment, internal note and admin users still work", async ({ browser }) => {
    const ticketId = await createTicket(`E2E-04 regression ${Date.now()}`);

    const requesterContext = await browser.newContext();
    const requester = await requesterContext.newPage();
    await signIn(requester, REQUESTER);
    await requester.getByRole("navigation", { name: /main/i }).getByRole("link", { name: /my tickets/i }).click();
    await expect(requester.getByRole("heading", { name: /my tickets/i })).toBeVisible();
    await requester.goto(`/tickets/${ticketId}`);

    await requester.getByLabel(/post a comment/i).fill("Regression comment from the requester.");
    await requester.getByRole("button", { name: /post comment/i }).click();
    await expect(requester.getByText("Regression comment from the requester.")).toBeVisible();

    await requester.getByLabel(/add attachment/i).setInputFiles({
      name: "regression.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 regression attachment"),
    });
    await requester.getByRole("button", { name: /^upload$/i }).click();
    await expect(requester.getByText("regression.pdf")).toBeVisible();
    await requesterContext.close();

    const staffContext = await browser.newContext();
    const staff = await staffContext.newPage();
    await signIn(staff, STAFF, /welcome back/i);
    await staff.goto(`/staff/tickets/${ticketId}`);
    await staff.getByRole("tab", { name: /internal notes/i }).click();
    await staff.getByLabel(/add an internal note/i).fill("Regression internal note.");
    await staff.getByRole("button", { name: /post note/i }).click();
    await expect(staff.getByText("Regression internal note.")).toBeVisible();
    await staffContext.close();

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signIn(admin, ADMIN, /welcome back/i);
    await admin.getByRole("link", { name: /^admin$/i }).click();
    await expect(admin.getByRole("heading", { name: /user management/i })).toBeVisible();
    await adminContext.close();
  });
});

test.describe("Responsive screenshots (VISUAL-01)", () => {
  let ticketId: string;
  test.beforeAll(async () => {
    ticketId = await createTicket(`VISUAL-01 fixture ${Date.now()}`, "HIGH");
    await addActionViaApi(ticketId, "Checked the device and reinstalled the VPN client.", "VPN connects after reinstall.");
  });

  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`staff dashboard at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await signIn(page, STAFF, /welcome back/i);
      await expect(page.getByTestId("metric-card-new")).toBeVisible();
      await expect(page.getByText(/loading/i)).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `${SHOTS}/staff-dashboard/${name}.png`, fullPage: true });
    });

    test(`requester dashboard at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await signIn(page, REQUESTER);
      await expect(page.getByTestId("metric-card-my-open")).toBeVisible();
      await expect(page.getByText(/loading/i)).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `${SHOTS}/requester-dashboard/${name}.png`, fullPage: true });
    });

    test(`actions taken at ${name}`, async ({ page }) => {
      await page.setViewportSize(size);
      await signIn(page, STAFF, /welcome back/i);
      await page.goto(`/staff/tickets/${ticketId}`);
      await page.getByRole("tab", { name: /actions taken/i }).click();
      await expect(page.getByText("Checked the device and reinstalled the VPN client.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: `${SHOTS}/actions-taken/${name}.png`, fullPage: true });
    });
  }
});
