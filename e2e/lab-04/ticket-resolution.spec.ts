// e2e/lab-04/ticket-resolution.spec.ts (E2E-02)
import { test, expect } from "@playwright/test";
import { createTicket, signIn, STAFF, STAFF_2 } from "./helpers";

test.describe("Ticket resolution (E2E-02)", () => {
  test("resolve gate, resolve after an Action, then reopen", async ({ browser }) => {
    const ticketId = await createTicket(`E2E-02 gate ${Date.now()}`);
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, STAFF, /welcome back/i);
    await page.goto(`/staff/tickets/${ticketId}`);

    await page.getByLabel(/ticket owner/i).selectOption({ label: "Claim for myself" });
    await expect(page.getByLabel(/current status/i)).toHaveValue("OPEN");
    await page.getByLabel(/current status/i).selectOption("IN_PROGRESS");
    await expect(page.getByLabel(/current status/i)).toHaveValue("IN_PROGRESS");

    // Gate: no Action yet, so Resolved is refused and the select reverts.
    await page.getByLabel(/current status/i).selectOption("RESOLVED");
    await expect(page.getByText("Record at least one action before resolving.")).toBeVisible();
    await expect(page.getByLabel(/current status/i)).toHaveValue("IN_PROGRESS");

    await page.getByRole("tab", { name: /actions taken/i }).click();
    await page.getByRole("button", { name: /add action/i }).click();
    await page.getByLabel(/^description/i).fill("Reset the user's profile.");
    await page.getByLabel(/^result/i).fill("User can sign in again.");
    await page.getByRole("button", { name: /save action/i }).click();
    await expect(page.getByText("Reset the user's profile.")).toBeVisible();

    await page.getByLabel(/current status/i).selectOption("RESOLVED");
    await expect(page.getByLabel(/current status/i)).toHaveValue("RESOLVED");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/resolved/i);

    // Reopen, then continue to In Progress (AC-14, no dead end).
    await page.getByLabel(/current status/i).selectOption("REOPENED");
    await expect(page.getByLabel(/current status/i)).toHaveValue("REOPENED");
    await page.getByLabel(/current status/i).selectOption("IN_PROGRESS");
    await expect(page.getByLabel(/current status/i)).toHaveValue("IN_PROGRESS");
    await context.close();
  });

  test("a stale status change from a second session is rejected with a Reload callout", async ({ browser }) => {
    const ticketId = await createTicket(`E2E-02 stale ${Date.now()}`);

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await signIn(pageA, STAFF, /welcome back/i);
    await pageA.goto(`/staff/tickets/${ticketId}`);
    await pageA.getByLabel(/ticket owner/i).selectOption({ label: "Claim for myself" });
    await expect(pageA.getByLabel(/current status/i)).toHaveValue("OPEN");

    // Session B loads the same version of the ticket.
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await signIn(pageB, STAFF_2, /welcome back/i);
    await pageB.goto(`/staff/tickets/${ticketId}`);
    await expect(pageB.getByLabel(/current status/i)).toHaveValue("OPEN");

    // Session A changes the priority, bumping the version.
    await pageA.getByLabel(/it priority/i).selectOption("HIGH");
    await expect(pageA.getByLabel(/it priority/i)).toHaveValue("HIGH");

    // Session B still holds the old version and now changes status.
    await pageB.getByLabel(/current status/i).selectOption("IN_PROGRESS");
    const callout = pageB.getByRole("alert").filter({ hasText: /someone changed this ticket/i });
    await expect(callout).toBeVisible();
    await expect(pageB.getByLabel(/current status/i)).toHaveValue("OPEN");

    // Reload fetches the latest values and clears the callout.
    await callout.getByRole("button", { name: /reload/i }).click();
    await expect(pageB.getByLabel(/it priority/i)).toHaveValue("HIGH");
    await expect(callout).toHaveCount(0);
    await pageB.getByLabel(/current status/i).selectOption("IN_PROGRESS");
    await expect(pageB.getByLabel(/current status/i)).toHaveValue("IN_PROGRESS");

    await contextA.close();
    await contextB.close();
  });
});
