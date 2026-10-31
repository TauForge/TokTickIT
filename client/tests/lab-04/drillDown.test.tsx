import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { MyTickets } from "../../src/screens/MyTickets";
import { StaffTicketQueue } from "../../src/screens/StaffTicketQueue";
import { amy, jennifer, on, routeFetch } from "./helpers";

const emptyPage = { data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } };
const row = (id: string, status: string) => ({ id, ticketNumber: `TKT-${id}`, summary: `Summary ${id}`, categoryName: "Hardware", requestedPriority: "LOW", itPriority: "LOW", status, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" });

describe("Dashboard drill-down filters", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("staff queue applies ownerId, itPriority and activeOnly from the query string", async () => {
    const calls = routeFetch(amy, [on("GET", /\/staff\/tickets\?/, () => ({ body: emptyPage }))]);
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/staff/tickets?ownerId=unassigned&itPriority=HIGH&activeOnly=true"]}>
          <StaffTicketQueue />
        </MemoryRouter>
      </AuthProvider>,
    );
    await screen.findByRole("heading", { name: "My Queue" });

    const url = new URL(calls.filter((c) => c.url.includes("/staff/tickets?")).at(-1)!.url);
    expect(url.searchParams.get("ownerId")).toBe("unassigned");
    expect(url.searchParams.get("itPriority")).toBe("HIGH");
    expect(url.searchParams.get("activeOnly")).toBe("true");
    expect(screen.getByLabelText("Active tickets only")).toBeChecked();
    expect(screen.getByLabelText("Owner")).toHaveValue("unassigned");
  });

  it("staff queue supports my assigned (ownerId = me)", async () => {
    const calls = routeFetch(amy, [on("GET", /\/staff\/tickets\?/, () => ({ body: emptyPage }))]);
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/staff/tickets?ownerId=2&activeOnly=true"]}>
          <StaffTicketQueue />
        </MemoryRouter>
      </AuthProvider>,
    );
    await screen.findByRole("heading", { name: "My Queue" });
    await waitFor(() => expect(screen.getByLabelText("Owner")).toHaveValue("2"));
    expect(new URL(calls.filter((c) => c.url.includes("/staff/tickets?")).at(-1)!.url).searchParams.get("ownerId")).toBe("2");
  });

  it("My Tickets filters client-side by the status in the query string", async () => {
    routeFetch(jennifer, [
      on("GET", /\/api\/v1\/tickets\?/, () => ({ body: { items: [row("1", "RESOLVED"), row("2", "OPEN"), row("3", "RESOLVED")], page: 1, pageSize: 50, totalItems: 3, totalPages: 1 } })),
    ]);
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/tickets?status=RESOLVED"]}>
          <MyTickets />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText("TKT-1")).toBeInTheDocument();
    expect(screen.getByText("TKT-3")).toBeInTheDocument();
    expect(screen.queryByText("TKT-2")).toBeNull();
    expect(screen.getByLabelText("Current Status")).toHaveValue("RESOLVED");
  });
});
