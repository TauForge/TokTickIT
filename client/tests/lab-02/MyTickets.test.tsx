import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MyTickets } from "../../src/screens/MyTickets";

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <MyTickets requesterId={1} />
    </MemoryRouter>,
  );
}

describe("MyTickets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the empty state when totalItems is 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }),
      }),
    );

    renderWithRouter();

    const empty = await screen.findByTestId("my-tickets-empty-state");
    expect(within(empty).getByText(/no tickets yet/i)).toBeInTheDocument();
    expect(within(empty).getByRole("link", { name: /create ticket/i })).toBeInTheDocument();
  });

  it("renders ticket rows with badges when items are present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
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
      }),
    );

    renderWithRouter();

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByTestId("priority-badge-requested")).toHaveTextContent("Medium");
    expect(screen.getByTestId("status-badge")).toHaveTextContent("New");
  });

  it("sends categoryId, status, and sort as query parameters when filters are changed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    renderWithRouter();
    await screen.findByLabelText(/current status/i);

    await user.selectOptions(screen.getByLabelText(/current status/i), "NEW");
    await user.selectOptions(screen.getByLabelText(/^sort by/i), "updatedAt");

    await waitFor(() => {
      const lastCallUrl = fetchMock.mock.calls.at(-1)?.[0] as string;
      expect(lastCallUrl).toContain("status=NEW");
      expect(lastCallUrl).toContain("sort=updatedAt");
    });
  });
});
