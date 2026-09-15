import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { MyTickets } from "../../src/screens/MyTickets";
import { mockFetchByUrl, meResponse } from "../lab-03/testHelpers";

const requester = { id: 1, email: "jennifer.anderson@toktickit.dev", displayName: "Jennifer Anderson", role: "REQUESTER" as const, mustChangePassword: false };

function renderWithRouter() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <MyTickets />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("MyTickets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the empty state when totalItems is 0", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(requester),
      "/api/v1/tickets": { ok: true, json: async () => ({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }) },
    });

    renderWithRouter();

    const empty = await screen.findByTestId("my-tickets-empty-state");
    expect(within(empty).getByText(/no tickets yet/i)).toBeInTheDocument();
    expect(within(empty).getByRole("link", { name: /create ticket/i })).toBeInTheDocument();
  });

  it("renders ticket rows with badges when items are present", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(requester),
      "/api/v1/tickets": {
        ok: true,
        json: async () => ({
          items: [
            {
              id: "t1",
              ticketNumber: "TKT-2026-000001",
              summary: "Laptop battery drains quickly",
              categoryName: "Hardware",
              requestedPriority: "MEDIUM",
              itPriority: "MEDIUM",
              status: "NEW",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-02T00:00:00.000Z",
            },
          ],
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
        }),
      },
    });

    renderWithRouter();

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByTestId("priority-badge-requested")).toHaveTextContent("Medium");
    expect(screen.getByTestId("status-badge")).toHaveTextContent("New");
    expect(screen.getByRole("link", { name: "TKT-2026-000001" })).toHaveAttribute("href", "/tickets/t1");
  });

  it("sends categoryId, status, and sort as query parameters when filters are changed", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        calls.push(url);
        if (url.includes("/api/v1/me")) return Promise.resolve(meResponse(requester));
        return Promise.resolve({ ok: true, json: async () => ({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }) });
      }),
    );
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    renderWithRouter();
    await screen.findByLabelText(/current status/i);

    await user.selectOptions(screen.getByLabelText(/current status/i), "NEW");
    await user.selectOptions(screen.getByLabelText(/^sort by/i), "updatedAt");

    await waitFor(() => {
      const lastTicketsCall = calls.filter((c) => c.includes("/tickets?")).at(-1) ?? "";
      expect(lastTicketsCall).toContain("status=NEW");
      expect(lastTicketsCall).toContain("sort=updatedAt");
    });
  });
});
