// e2e/lab-04/actions-taken-flow.spec.ts (E2E-01)
import { test, expect } from "@playwright/test";
import { createTicket, signIn, STAFF, REQUESTER } from "./helpers";

test.describe("Actions Taken flow (E2E-01)", () => {
  test("staff adds and edits an Action, and the Requester sees it read-only", async ({ browser }) => {
    const ticketId = await createTicket(`E2E-01 actions ${Date.now()}`);

    const staffContext = await browser.newContext();
    const staff = await staffContext.newPage();
    await signIn(staff, STAFF, /welcome back/i);
    await staff.goto(`/staff/tickets/${ticketId}`);
    await staff.getByRole("tab", { name: /actions taken/i }).click();
    await expect(staff.getByText("No actions recorded yet.")).toBeVisible();

    // Validation first: empty submit keeps the form open and shows field errors.
    await staff.getByRole("button", { name: /add action/i }).click();
    await staff.getByRole("button", { name: /save action/i }).click();
    await expect(staff.getByRole("alert").first()).toBeVisible();

    await staff.getByLabel(/^description/i).fill("Replaced the failing battery.");
    await staff.getByLabel(/^result/i).fill("Laptop powers on and holds charge.");
    await staff.getByLabel(/follow-up required/i).check();
    await staff.getByLabel(/follow-up note/i).fill("Check battery health next week.");
    await staff.getByRole("button", { name: /save action/i }).click();

    await expect(staff.getByText("Replaced the failing battery.")).toBeVisible();
    await expect(staff.getByText("Follow-up needed")).toBeVisible();
    await expect(staff.getByRole("status").filter({ hasText: "Action saved." })).toHaveCount(1);

    // Edit as the performer.
    await staff.getByRole("button", { name: /view action by/i }).click();
    await staff.getByRole("button", { name: /^edit$/i }).click();
    await staff.getByLabel(/^result/i).fill("Laptop powers on, battery health 98 percent.");
    await staff.getByRole("button", { name: /save changes/i }).click();
    await expect(staff.getByRole("region", { name: /action details/i }).getByText("Laptop powers on, battery health 98 percent.")).toBeVisible();
    await staffContext.close();

    // Requester: sees the Action, with no Add or Edit controls.
    const requesterContext = await browser.newContext();
    const requester = await requesterContext.newPage();
    await signIn(requester, REQUESTER);
    await requester.goto(`/tickets/${ticketId}`);
    await expect(requester.getByRole("heading", { name: /actions taken/i })).toBeVisible();
    await expect(requester.getByText("Replaced the failing battery.")).toBeVisible();
    await expect(requester.getByText("Check battery health next week.")).toBeVisible();
    await expect(requester.getByRole("button", { name: /add action|^edit$/i })).toHaveCount(0);
    await requesterContext.close();
  });
});
