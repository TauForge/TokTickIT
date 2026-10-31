// e2e/lab-04/helpers.ts
import { expect, request as playwrightRequest, type Page } from "@playwright/test";

// The client calls the API on its own origin (client/src/api/apiClient.ts), so setup
// requests target it directly instead of the `baseURL` fixture (the client origin).
export const apiBaseUrl = process.env.E2E_API_BASE_URL ?? "http://localhost:3000";
export const PASSWORD = "DevPass123!";
export const STAFF = "amy.tran@toktickit.dev";
export const STAFF_2 = "carlos.mendez@toktickit.dev";
export const REQUESTER = "jennifer.anderson@toktickit.dev";
export const ADMIN = "admin@toktickit.dev";

export const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  tablet: { width: 820, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const;

// Creates a fresh NEW ticket as the Requester through the API so each spec owns its fixture
// and never depends on what earlier runs left in the persistent dev database.
export async function createTicket(summary: string, requestedPriority = "LOW"): Promise<string> {
  const api = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
  const login = await api.post("/api/v1/auth/login", { data: { email: REQUESTER, password: PASSWORD } });
  const cookie = login.headers()["set-cookie"] ?? "";
  const categories = await (await api.get("/api/categories")).json();
  const created = await api.post("/api/v1/tickets", {
    headers: { Cookie: cookie },
    data: { summary, description: "Created fresh for a Lab 4 E2E spec.", categoryId: categories[0].id, requestedPriority },
  });
  const id = (await created.json()).id as string;
  await api.dispose();
  return id;
}

export async function signIn(page: Page, email: string, landing: RegExp = /welcome/i) {
  await page.goto("/");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  // Wait for the dashboard to render real content, not just the shell, before navigating on.
  await expect(page.getByRole("heading", { level: 1, name: landing })).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const [scrollWidth, clientWidth] = await Promise.all([
    page.evaluate(() => document.documentElement.scrollWidth),
    page.evaluate(() => document.documentElement.clientWidth),
  ]);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

// Adds one Action Taken to a ticket as IT Staff through the API (fixture for screenshots).
export async function addActionViaApi(ticketId: string, description: string, result: string) {
  const api = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
  const login = await api.post("/api/v1/auth/login", { data: { email: STAFF, password: PASSWORD } });
  const cookie = login.headers()["set-cookie"] ?? "";
  const res = await api.post(`/api/v1/staff/tickets/${ticketId}/actions`, {
    headers: { Cookie: cookie },
    data: { description, result },
  });
  expect(res.status()).toBe(201);
  await api.dispose();
}
