import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { admin, amy, jennifer, on, routeFetch } from "./helpers";
import { emptyStaffDashboard, renderStaffDashboard, staffDashboard } from "./dashboardHelpers";

const dashboardRoute = (body: unknown = staffDashboard) => on("GET", /\/api\/v1\/dashboard\/staff$/, () => ({ body }));

function linkHref(name: string | RegExp) {
  return screen.getByRole("link", { name }).getAttribute("href");
}

describe("Staff dashboard (UI-03)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("greets the user and shows every metric card with its value", async () => {
    routeFetch(amy, [dashboardRoute()]);
    renderStaffDashboard();

    expect(await screen.findByRole("heading", { name: "Welcome back, Amy Tran" })).toBeInTheDocument();
    for (const [label, value] of [["New", "3"], ["Open", "4"], ["In Progress", "5"], ["Waiting for Requester", "2"], ["My Assigned", "6"], ["Unassigned", "7"]]) {
      const card = screen.getByTestId(`metric-card-${label.toLowerCase().replace(/ /g, "-")}`);
      expect(within(card).getByText(label)).toBeInTheDocument();
      expect(within(card).getByText(value)).toBeInTheDocument();
    }
  });

  it("cards are real links with accessible names and the spec 5.4 drill-down URLs", async () => {
    routeFetch(amy, [dashboardRoute()]);
    renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome back/i });

    expect(linkHref("View New tickets")).toBe("/staff/tickets?status=NEW");
    expect(linkHref("View Open tickets")).toBe("/staff/tickets?status=OPEN");
    expect(linkHref("View In Progress tickets")).toBe("/staff/tickets?status=IN_PROGRESS");
    expect(linkHref("View Waiting for Requester tickets")).toBe("/staff/tickets?status=WAITING_FOR_REQUESTER");
    expect(linkHref("View My Assigned tickets")).toBe("/staff/tickets?ownerId=2&activeOnly=true");
    expect(linkHref("View Unassigned tickets")).toBe("/staff/tickets?ownerId=unassigned&activeOnly=true");
  });

  it("By IT Priority card shows Low, Medium, High counts as links", async () => {
    routeFetch(amy, [dashboardRoute()]);
    renderStaffDashboard();
    const card = await screen.findByTestId("metric-card-by-it-priority");

    expect(within(card).getByRole("link", { name: "View Low priority tickets" })).toHaveAttribute("href", "/staff/tickets?itPriority=LOW&activeOnly=true");
    expect(within(card).getByRole("link", { name: "View Medium priority tickets" })).toHaveAttribute("href", "/staff/tickets?itPriority=MEDIUM&activeOnly=true");
    const high = within(card).getByRole("link", { name: "View High priority tickets" });
    expect(high).toHaveAttribute("href", "/staff/tickets?itPriority=HIGH&activeOnly=true");
    expect(high).toHaveTextContent("2");
  });

  it("renders the Urgent, Recently Updated and My Recent Actions lists with row links", async () => {
    routeFetch(amy, [dashboardRoute()]);
    renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome back/i });

    const urgent = screen.getByRole("region", { name: "Urgent" });
    expect(within(urgent).getByRole("link", { name: /TKT-2026-000010/ })).toHaveAttribute("href", "/staff/tickets/u1");
    expect(within(urgent).getByText("Server room offline")).toBeInTheDocument();
    expect(within(urgent).getByText("High")).toBeInTheDocument();

    const recent = screen.getByRole("region", { name: "Recently Updated" });
    expect(within(recent).getByRole("link", { name: /TKT-2026-000011/ })).toHaveAttribute("href", "/staff/tickets/r1");
    expect(within(recent).getByText("In Progress")).toBeInTheDocument();

    const actions = screen.getByRole("region", { name: "My Recent Actions" });
    expect(within(actions).getByRole("link", { name: /TKT-2026-000012/ })).toHaveAttribute("href", "/staff/tickets/t5");
    expect(within(actions).getByText("Swapped the toner")).toBeInTheDocument();
  });

  it("has Quick Actions for Create Ticket, Search Tickets and My Queue", async () => {
    routeFetch(amy, [dashboardRoute()]);
    renderStaffDashboard();
    const quick = await screen.findByRole("region", { name: "Quick Actions" });

    expect(within(quick).getByRole("link", { name: "Create Ticket" })).toHaveAttribute("href", "/tickets/new");
    expect(within(quick).getByRole("link", { name: "Search Tickets" })).toHaveAttribute("href", "/staff/tickets");
    expect(within(quick).getByRole("link", { name: "My Queue" })).toHaveAttribute("href", "/staff/tickets?ownerId=2&activeOnly=true");
  });

  it("zero counts show 0 and empty lists show the empty text", async () => {
    routeFetch(amy, [dashboardRoute(emptyStaffDashboard)]);
    renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome back/i });

    expect(within(screen.getByTestId("metric-card-new")).getByText("0")).toBeInTheDocument();
    expect(within(screen.getByTestId("metric-card-by-it-priority")).getAllByText("0")).toHaveLength(3);
    expect(screen.getAllByText("No tickets need attention.").length).toBe(2);
    expect(within(screen.getByRole("region", { name: "My Recent Actions" })).getByText("No actions recorded yet.")).toBeInTheDocument();
  });

  it("shows the Users card only for an Administrator", async () => {
    const withUsers = { ...staffDashboard, userCounts: { active: 8, inactive: 2, requester: 5, itStaff: 3, administrator: 2 } };
    routeFetch(admin, [dashboardRoute(withUsers)]);
    const { unmount } = renderStaffDashboard();

    const card = await screen.findByTestId("metric-card-users");
    expect(within(card).getByRole("link", { name: "View Users" })).toHaveAttribute("href", "/admin/users");
    expect(within(card).getByText(/Active/)).toHaveTextContent("8");
    expect(within(card).getByText(/Inactive/)).toHaveTextContent("2");
    unmount();
    vi.unstubAllGlobals();

    routeFetch(amy, [dashboardRoute()]);
    renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome back/i });
    expect(screen.queryByTestId("metric-card-users")).toBeNull();
  });

  it("shows a busy skeleton while loading", async () => {
    routeFetch(amy, [dashboardRoute()]);
    renderStaffDashboard();

    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    await screen.findByRole("heading", { name: /welcome back/i });
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  });

  it("Refresh re-fetches and is disabled while loading", async () => {
    const calls = routeFetch(amy, [dashboardRoute()]);
    renderStaffDashboard();
    await screen.findByRole("heading", { name: /welcome back/i });
    const refresh = screen.getByRole("button", { name: "Refresh" });
    expect(refresh).toBeEnabled();

    fireEvent.click(refresh);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
    expect(calls.filter((c) => c.url.endsWith("/dashboard/staff"))).toHaveLength(2);
  });

  it("shows a generic message with Retry on failure and recovers", async () => {
    let fail = true;
    routeFetch(amy, [on("GET", /\/dashboard\/staff$/, () => (fail ? { status: 500, body: { error: { message: "Boom internal" } } } : { body: staffDashboard }))]);
    const user = userEvent.setup();
    renderStaffDashboard();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Unable to load the dashboard right now. Please try again.");
    expect(alert).not.toHaveTextContent("Boom internal");

    fail = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });

  it("shows the forbidden message to a Requester without requesting dashboard data", async () => {
    const calls = routeFetch(jennifer, [dashboardRoute()]);
    renderStaffDashboard();

    expect(await screen.findByText("You don't have access to this page.")).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("/dashboard/staff"))).toBe(false);
  });

  it("shows the forbidden message when the API answers 403", async () => {
    routeFetch(amy, [on("GET", /\/dashboard\/staff$/, () => ({ status: 403, body: { error: { code: "FORBIDDEN", message: "Forbidden" } } }))]);
    renderStaffDashboard();

    expect(await screen.findByText("You don't have access to this page.")).toBeInTheDocument();
  });
});
