import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { amy, jennifer, on, routeFetch } from "./helpers";
import { emptyRequesterDashboard, renderRequesterDashboard, requesterDashboard } from "./dashboardHelpers";

const dashboardRoute = (body: unknown = requesterDashboard) => on("GET", /\/api\/v1\/dashboard\/requester$/, () => ({ body }));

describe("Requester dashboard (UI-04)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("greets the user and shows the five cards with values", async () => {
    routeFetch(jennifer, [dashboardRoute()]);
    renderRequesterDashboard();

    expect(await screen.findByRole("heading", { name: "Welcome, Jennifer Anderson" })).toBeInTheDocument();
    for (const [id, label, value] of [["my-open", "My Open", "4"], ["in-progress", "In Progress", "2"], ["waiting-for-me", "Waiting for Me", "1"], ["resolved", "Resolved", "3"], ["closed", "Closed", "9"]]) {
      const card = screen.getByTestId(`metric-card-${id}`);
      expect(within(card).getByText(label)).toBeInTheDocument();
      expect(within(card).getByText(value)).toBeInTheDocument();
    }
  });

  it("View all links go to My Tickets with the matching status filter", async () => {
    routeFetch(jennifer, [dashboardRoute()]);
    renderRequesterDashboard();
    await screen.findByRole("heading", { name: /welcome/i });

    expect(screen.getByRole("link", { name: "View all My Open tickets" })).toHaveAttribute("href", "/tickets?activeOnly=true");
    expect(screen.getByRole("link", { name: "View all In Progress tickets" })).toHaveAttribute("href", "/tickets?status=IN_PROGRESS");
    expect(screen.getByRole("link", { name: "View all Waiting for Me tickets" })).toHaveAttribute("href", "/tickets?status=WAITING_FOR_REQUESTER");
    expect(screen.getByRole("link", { name: "View all Resolved tickets" })).toHaveAttribute("href", "/tickets?status=RESOLVED");
    expect(screen.getByRole("link", { name: "View all Closed tickets" })).toHaveAttribute("href", "/tickets?status=CLOSED");
  });

  it("labels Waiting for Me with text when above zero and not when zero", async () => {
    routeFetch(jennifer, [dashboardRoute()]);
    const { unmount } = renderRequesterDashboard();
    const card = await screen.findByTestId("metric-card-waiting-for-me");
    expect(within(card).getByText("Needs your reply")).toBeInTheDocument();
    unmount();
    vi.unstubAllGlobals();

    routeFetch(jennifer, [dashboardRoute(emptyRequesterDashboard)]);
    renderRequesterDashboard();
    await screen.findByRole("heading", { name: /welcome/i });
    expect(screen.queryByText("Needs your reply")).toBeNull();
  });

  it("lists Recently Updated and Recently Resolved rows with badges and ticket links", async () => {
    routeFetch(jennifer, [dashboardRoute()]);
    renderRequesterDashboard();
    await screen.findByRole("heading", { name: /welcome/i });

    const updated = screen.getByRole("region", { name: "Recently Updated" });
    expect(within(updated).getByRole("link", { name: /TKT-2026-000020/ })).toHaveAttribute("href", "/tickets/q1");
    expect(within(updated).getByText("VPN will not connect")).toBeInTheDocument();
    expect(within(updated).getByText("Waiting for Requester")).toBeInTheDocument();

    const resolved = screen.getByRole("region", { name: "Recently Resolved" });
    expect(within(resolved).getByRole("link", { name: /TKT-2026-000021/ })).toHaveAttribute("href", "/tickets/q2");
    expect(within(resolved).getByText("Resolved")).toBeInTheDocument();
  });

  it("has Quick Actions for Create Ticket and View My Tickets", async () => {
    routeFetch(jennifer, [dashboardRoute()]);
    renderRequesterDashboard();
    const quick = await screen.findByRole("region", { name: "Quick Actions" });

    expect(within(quick).getByRole("link", { name: "Create Ticket" })).toHaveAttribute("href", "/tickets/new");
    expect(within(quick).getByRole("link", { name: "View My Tickets" })).toHaveAttribute("href", "/tickets");
  });

  it("zero counts show 0 and empty lists show text", async () => {
    routeFetch(jennifer, [dashboardRoute(emptyRequesterDashboard)]);
    renderRequesterDashboard();
    await screen.findByRole("heading", { name: /welcome/i });

    expect(within(screen.getByTestId("metric-card-resolved")).getByText("0")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Recently Updated" })).getByText("No tickets yet.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Recently Resolved" })).getByText("No resolved tickets yet.")).toBeInTheDocument();
  });

  it("shows a busy skeleton while loading", async () => {
    routeFetch(jennifer, [dashboardRoute()]);
    renderRequesterDashboard();

    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    await screen.findByRole("heading", { name: /welcome/i });
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  });

  it("shows a generic message with Retry on failure and recovers", async () => {
    let fail = true;
    routeFetch(jennifer, [on("GET", /\/dashboard\/requester$/, () => (fail ? { status: 500, body: { error: { message: "SQL exploded" } } } : { body: requesterDashboard }))]);
    const user = userEvent.setup();
    renderRequesterDashboard();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Unable to load the dashboard right now. Please try again.");
    expect(alert).not.toHaveTextContent("SQL exploded");

    fail = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /welcome/i })).toBeInTheDocument());
  });

  it("shows the forbidden message to staff without requesting dashboard data", async () => {
    const calls = routeFetch(amy, [dashboardRoute()]);
    renderRequesterDashboard();

    expect(await screen.findByText("You don't have access to this page.")).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("/dashboard/requester"))).toBe(false);
  });
});
