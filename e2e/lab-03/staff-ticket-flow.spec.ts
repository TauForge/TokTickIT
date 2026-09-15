// e2e/lab-03/staff-ticket-flow.spec.ts
import { test, expect, request as playwrightRequest } from "@playwright/test";

// The client always calls the API on its own origin (client/src/api/apiClient.ts's
// apiBaseUrl), not through a Vite proxy — the setup context below has to target that
// same origin directly, not the `baseURL` fixture (which is the client's own origin).
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? "http://localhost:3000";

test.describe("Staff ticket lifecycle (E2E-03)", () => {
  test("claim -> priority -> status -> comment -> note, with notes never visible to the Requester", async ({ browser }) => {
    // Create a fresh, guaranteed-NEW/unassigned ticket via the API directly, rather than
    // picking `.first()` off the live queue table — the queue's first row is whatever
    // ticket sorts first by the default createdAt-desc order, which could already be
    // claimed/non-NEW from a prior run against a persistent dev/e2e database, making an
    // "auto-transitions to OPEN on claim" assertion flaky. Owning this ticket's creation
    // removes that dependency entirely.
    const setupApi = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
    const requesterLogin = await setupApi.post("/api/v1/auth/login", { data: { email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" } });
    const requesterCookies = requesterLogin.headers()["set-cookie"];
    const categoriesResponse = await setupApi.get("/api/categories");
    const categoryId = (await categoriesResponse.json())[0].id;
    const created = await setupApi.post("/api/v1/tickets", {
      headers: { Cookie: requesterCookies ?? "" },
      data: { summary: "E2E staff lifecycle fixture", description: "Created fresh for this spec run.", categoryId, requestedPriority: "LOW" },
    });
    const ticketId = (await created.json()).id;
    await setupApi.dispose();

    const staffContext = await browser.newContext();
    const staffPage = await staffContext.newPage();
    await staffPage.goto("/");
    await staffPage.getByLabel(/email/i).fill("amy.tran@toktickit.dev");
    await staffPage.getByLabel(/password/i).fill("DevPass123!");
    await staffPage.getByRole("button", { name: /sign in/i }).click();
    // Wait for the login to actually land (session cookie set) before navigating directly
    // to a protected URL — otherwise the goto below can race the async login response and
    // hit the route guard while still unauthenticated, bouncing back to Sign In.
    await staffPage.getByRole("link", { name: /my queue/i }).waitFor();
    await staffPage.goto(`/staff/tickets/${ticketId}`);

    await staffPage.getByLabel(/ticket owner/i).selectOption({ label: "Claim for myself" });
    // Current status only ever renders as the selected value of the status <select>, never
    // as separate visible text — getByText(/open/i) matches the hidden <option> element
    // itself (options stay in the accessibility tree even while collapsed), so assert the
    // select's value directly instead of visible text.
    await expect(staffPage.getByLabel(/current status/i)).toHaveValue("OPEN");

    await staffPage.getByLabel(/it priority/i).selectOption("HIGH");
    await staffPage.getByLabel(/current status/i).selectOption("IN_PROGRESS");

    await staffPage.getByLabel(/post a comment/i).fill("We are on it.");
    await staffPage.getByRole("button", { name: /post comment/i }).click();
    await expect(staffPage.getByText("We are on it.")).toBeVisible();

    await staffPage.getByLabel(/add an internal note/i).fill("Escalating to vendor.");
    await staffPage.getByRole("button", { name: /post note/i }).click();
    await expect(staffPage.getByText("Escalating to vendor.")).toBeVisible();

    await staffContext.close();

    const requesterContext = await browser.newContext();
    const requesterPage = await requesterContext.newPage();
    await requesterPage.goto("/");
    await requesterPage.getByLabel(/email/i).fill("jennifer.anderson@toktickit.dev");
    await requesterPage.getByLabel(/password/i).fill("DevPass123!");
    await requesterPage.getByRole("button", { name: /sign in/i }).click();
    // Same login-completion barrier as the staff context above — avoid racing the direct
    // navigation against the async session cookie being set.
    await requesterPage.getByRole("heading", { name: /my tickets/i }).waitFor();
    await requesterPage.goto(`/tickets/${ticketId}`);

    await expect(requesterPage.getByText("We are on it.")).toBeVisible();
    await expect(requesterPage.getByText("Escalating to vendor.")).toHaveCount(0);
    await requesterContext.close();
  });
});
