import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { admin, amy, jennifer, makeAction, on, renderStaffDetail, routeFetch, staffTicket } from "./helpers";
import { emptyRequesterDashboard, emptyStaffDashboard, renderRequesterDashboard, renderStaffDashboard, requesterDashboard, staffDashboard } from "./dashboardHelpers";

const staffRoute = on("GET", /\/dashboard\/staff$/, () => ({ body: { ...staffDashboard, userCounts: { active: 1, inactive: 0, requester: 1, itStaff: 0, administrator: 0 } } }));
const requesterRoute = on("GET", /\/dashboard\/requester$/, () => ({ body: requesterDashboard }));

function navLinks() {
  return within(screen.getByRole("navigation")).getAllByRole("link");
}

describe("Accessibility (A11Y-01)", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lands every role on the Dashboard after login and lists it first in the nav", async () => {
    for (const [me, route, names] of [
      [jennifer, requesterRoute, ["Dashboard", "My Tickets", "Create Ticket"]],
      [amy, staffRoute, ["Dashboard", "My Queue", "Create Ticket"]],
      [admin, staffRoute, ["Dashboard", "My Queue", "Create Ticket", "Admin"]],
    ] as const) {
      window.history.pushState({}, "", "/");
      routeFetch(me, [route]);
      const { unmount } = render(<App />);
      await screen.findByRole("heading", { name: /welcome/i });
      expect(window.location.pathname).toBe("/dashboard");
      expect(navLinks().map((l) => l.textContent)).toEqual(names);
      unmount();
      vi.unstubAllGlobals();
    }
  });

  it("marks only the active nav item with aria-current=page", async () => {
    routeFetch(amy, [staffRoute, on("GET", /\/staff\/tickets\?/, () => ({ body: { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } } }))]);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: /welcome/i });

    const current = () => navLinks().filter((l) => l.getAttribute("aria-current") === "page").map((l) => l.textContent);
    expect(current()).toEqual(["Dashboard"]);

    await user.click(within(screen.getByRole("navigation")).getByRole("link", { name: "My Queue" }));
    await screen.findByRole("heading", { name: "My Queue" });
    expect(current()).toEqual(["My Queue"]);
  });

  it("dashboard announces load and refresh through a polite live region and exposes busy state", async () => {
    routeFetch(amy, [staffRoute]);
    const user = userEvent.setup();
    renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome/i });

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    await waitFor(() => expect(status).toHaveTextContent("Dashboard updated"));
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
    expect(screen.getByRole("status")).toHaveTextContent("Dashboard updated");
  });

  it("failure is announced as an alert and Retry receives focus after use", async () => {
    routeFetch(amy, [on("GET", /\/dashboard\/staff$/, () => ({ status: 500, body: {} }))]);
    renderStaffDashboard();
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: "Retry" });
    retry.focus();
    expect(retry).toHaveFocus();
  });

  it("metric links have accessible names that include the metric and are keyboard reachable", async () => {
    routeFetch(amy, [staffRoute]);
    const user = userEvent.setup();
    renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome/i });

    const links = screen.getAllByRole("link", { name: /^View .* tickets$/ });
    expect(links.length).toBeGreaterThanOrEqual(9);
    for (const link of links) expect(link).toHaveAttribute("href");

    await user.tab();
    expect(document.activeElement).not.toBe(document.body);
    expect(["A", "BUTTON"]).toContain(document.activeElement?.tagName);
  });

  it("requester dashboard conveys Waiting for Me with text, and status badges carry text", async () => {
    routeFetch(jennifer, [requesterRoute]);
    renderRequesterDashboard();
    await screen.findByRole("heading", { name: /welcome/i });

    expect(within(screen.getByTestId("metric-card-waiting-for-me")).getByText("Needs your reply")).toBeInTheDocument();
    for (const badge of screen.getAllByTestId("status-badge")) expect(badge.textContent?.trim()).not.toBe("");
  });

  it("empty and zero states are plain text, not blank", async () => {
    routeFetch(jennifer, [on("GET", /\/dashboard\/requester$/, () => ({ body: emptyRequesterDashboard }))]);
    const { unmount } = renderRequesterDashboard();
    await screen.findByRole("heading", { name: /welcome/i });
    expect(screen.getAllByText(/^No .* yet\.$/).length).toBe(2);
    unmount();
    vi.unstubAllGlobals();

    routeFetch(amy, [on("GET", /\/dashboard\/staff$/, () => ({ body: emptyStaffDashboard }))]);
    renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome/i });
    expect(screen.getAllByText("No tickets need attention.").length).toBe(2);
  });

  it("Actions Taken area: tab semantics, live region, labelled fields and focus on first error", async () => {
    routeFetch(amy, [
      on("GET", /\/staff\/tickets\/t1\/actions$/, () => ({ body: [makeAction()] })),
      on("GET", /\/staff\/tickets\/t1$/, () => ({ body: staffTicket })),
    ]);
    const user = userEvent.setup();
    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");

    const tab = await screen.findByRole("tab", { name: /actions taken/i });
    await user.click(tab);
    expect(tab).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel", { name: /actions taken/i });
    expect(within(panel).getByRole("status")).toHaveAttribute("aria-live", "polite");

    await user.click(within(panel).getByRole("button", { name: /add action/i }));
    const form = screen.getByRole("form", { name: /add action/i });
    for (const label of ["Action Date/Time", "Description", "Result", "Attachment notes"]) {
      expect(within(form).getByLabelText(label)).toBeInTheDocument();
    }
    await user.click(within(form).getByRole("button", { name: /save|submit|add/i }));
    await waitFor(() => expect(within(form).getByLabelText("Description")).toHaveFocus());
    expect(within(form).getByLabelText("Description")).toHaveAttribute("aria-invalid", "true");
    expect(within(panel).getAllByRole("alert").length).toBeGreaterThan(0);
  });
  it("moves focus into the form on Add Action and back to the panel heading on Cancel", async () => {
    routeFetch(amy, [
      on("GET", /\/staff\/tickets\/t1\/actions$/, () => ({ body: [makeAction()] })),
      on("GET", /\/staff\/tickets\/t1$/, () => ({ body: staffTicket })),
    ]);
    const user = userEvent.setup();
    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");
    await user.click(screen.getByRole("tab", { name: /actions taken/i }));
    const panel = await screen.findByTestId("actions-taken-panel");

    await user.click(await within(panel).findByRole("button", { name: /add action/i }));
    expect(within(panel).getByLabelText("Action Date/Time")).toHaveFocus();
    await user.click(within(panel).getByRole("button", { name: /cancel/i }));
    expect(within(panel).getByRole("heading", { name: "Actions Taken" })).toHaveFocus();
  });

  it("labels every Actions Taken cell so the mobile card layout keeps its meaning", async () => {
    routeFetch(amy, [
      on("GET", /\/staff\/tickets\/t1\/actions$/, () => ({ body: [makeAction()] })),
      on("GET", /\/staff\/tickets\/t1$/, () => ({ body: staffTicket })),
    ]);
    const user = userEvent.setup();
    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");
    await user.click(screen.getByRole("tab", { name: /actions taken/i }));
    const panel = await screen.findByTestId("actions-taken-panel");
    const labels = Array.from((await within(panel).findAllByRole("row"))[1].querySelectorAll("td[data-label]")).map((td) => td.getAttribute("data-label"));
    expect(labels).toEqual(["Date/Time", "Performed by", "Result", "Follow-up", "Description", "Attachment notes"]);
  });
});
