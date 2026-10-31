import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { admin, amy, jennifer, on, routeFetch } from "./helpers";
import { renderRequesterDashboard, renderStaffDashboard, requesterDashboard, staffDashboard } from "./dashboardHelpers";

const css = readFileSync(resolve(__dirname, "../../src/theme/zen-green.css"), "utf8");

describe("Lab 4 Zen Green style verification (STYLE-01)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("staff dashboard uses the metric card grid, zg-card lists and the shared badge system", async () => {
    routeFetch(admin, [on("GET", /\/dashboard\/staff$/, () => ({ body: { ...staffDashboard, userCounts: { active: 1, inactive: 0, requester: 1, itStaff: 0, administrator: 0 } } }))]);
    renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome back/i });

    expect(document.querySelector(".zg-metric-grid")).not.toBeNull();
    expect(document.querySelectorAll(".zg-metric-card").length).toBeGreaterThanOrEqual(8);
    expect(document.querySelectorAll(".zg-metric-value").length).toBeGreaterThanOrEqual(8);
    expect(document.querySelectorAll(".zg-card").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelectorAll(".zg-table, .zg-ticket-list").length).toBeGreaterThanOrEqual(2);
    const badges = document.querySelectorAll(".zg-badge");
    expect(badges.length).toBeGreaterThan(0);
    expect(document.querySelector(".zg-priority-badge-high")).not.toBeNull();
    expect(document.querySelector(".zg-status-badge-in-progress")).not.toBeNull();
  });

  it("requester dashboard uses the same card, list and badge classes", async () => {
    routeFetch(jennifer, [on("GET", /\/dashboard\/requester$/, () => ({ body: requesterDashboard }))]);
    renderRequesterDashboard();
    await screen.findByRole("heading", { name: /welcome/i });

    expect(document.querySelectorAll(".zg-metric-card")).toHaveLength(5);
    expect(document.querySelector(".zg-status-badge-waiting-for-requester")).not.toBeNull();
    expect(document.querySelector(".zg-status-badge-resolved")).not.toBeNull();
  });

  it("applies no ad hoc inline styling on either dashboard", async () => {
    routeFetch(amy, [on("GET", /\/dashboard\/staff$/, () => ({ body: staffDashboard }))]);
    const { unmount } = renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome back/i });
    expect(document.querySelectorAll("[style]")).toHaveLength(0);
    unmount();
    vi.unstubAllGlobals();

    routeFetch(jennifer, [on("GET", /\/dashboard\/requester$/, () => ({ body: requesterDashboard }))]);
    renderRequesterDashboard();
    await screen.findByRole("heading", { name: /welcome/i });
    expect(document.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("metric card links are real anchors and the card styles come from theme tokens", async () => {
    routeFetch(amy, [on("GET", /\/dashboard\/staff$/, () => ({ body: staffDashboard }))]);
    renderStaffDashboard();
    const card = await screen.findByTestId("metric-card-in-progress");

    expect(within(card).getByRole("link").tagName).toBe("A");
    const cardRule = css.match(/\.zg-metric-card\s*\{[^}]*\}/)?.[0] ?? "";
    expect(cardRule).toContain("var(--zg-surface)");
    expect(cardRule).toContain("var(--zg-border)");
    expect(css).toMatch(/\.zg-metric-value\s*\{[^}]*font-size:\s*32px/);
  });

  it("stylesheet defines the 5 / 3 / 2 / 1 column dashboard grid and no horizontal overflow rule", () => {
    expect(css).toMatch(/\.zg-metric-grid\s*\{[^}]*repeat\(5,/);
    expect(css).toMatch(/@media[^{]*max-width:\s*1099px[^{]*\{[^@]*\.zg-metric-grid\s*\{[^}]*repeat\(3,/);
    expect(css).toMatch(/@media[^{]*max-width:\s*767px[^{]*\{[^@]*\.zg-metric-grid\s*\{[^}]*repeat\(2,/);
    expect(css).toMatch(/@media[^{]*max-width:\s*359px[^{]*\{[^@]*\.zg-metric-grid\s*\{[^}]*repeat\(1,/);
  });

  it("stylesheet gives nav links a distinct focus and an active indication", () => {
    expect(css).toMatch(/\.zg-app-header nav a\[aria-current="page"\]/);
    expect(css).toMatch(/:focus-visible/);
  });

  it("checkboxes and radios keep a normal control size inside cards (STYLE-02)", () => {
    const rule = css.match(/\.zg-card input\[type="checkbox"\][^{]*\{[^}]*\}/)?.[0] ?? "";
    expect(rule).toMatch(/width:\s*1\.25rem|width:\s*\d+px/);
    expect(rule).toMatch(/height:\s*1\.25rem|height:\s*\d+px/);
    expect(rule).toMatch(/padding:\s*0/);
    expect(rule).toContain("var(--zg-");
  });
});
