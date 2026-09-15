import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { StaffTicketQueue } from "../../src/screens/StaffTicketQueue";
import { mockFetchByUrl, meResponse } from "./testHelpers";

const staff = { id: 2, email: "amy.tran@toktickit.dev", displayName: "Amy Tran", role: "IT_STAFF" as const, mustChangePassword: false };

const page = {
  data: [
    { id: "t1", ticketNumber: "TKT-2026-000001", createdAt: "2026-01-01T00:00:00.000Z", summary: "Battery drains fast", categoryName: "Hardware", requestedPriority: "MEDIUM", itPriority: "MEDIUM", status: "NEW", ownerId: null, ownerDisplayName: null, updatedAt: "2026-01-01T00:00:00.000Z" },
  ],
  meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
};

function renderQueue() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <StaffTicketQueue />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("StaffTicketQueue", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the queue table with Owner shown as Unassigned when null", async () => {
    mockFetchByUrl({ "/api/v1/me": meResponse(staff), "/api/v1/staff/tickets": { ok: true, json: async () => page } });

    renderQueue();

    expect(await screen.findByText("TKT-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("empty state with an active filter shows Clear Filters, without a filter shows the plain empty message", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(staff),
      "/api/v1/staff/tickets": { ok: true, json: async () => ({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 } }) },
    });
    const user = userEvent.setup();

    renderQueue();
    await waitFor(() => expect(screen.getByTestId("staff-queue-empty-state")).toBeInTheDocument());

    await user.type(screen.getByLabelText(/search/i), "nonexistent");
    await waitFor(() => expect(screen.getByTestId("staff-queue-no-results")).toBeInTheDocument());
  });

  it("shows a safe forbidden state instead of crashing on a 403", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(staff),
      "/api/v1/staff/tickets": { ok: false, status: 403, json: async () => ({ error: { message: "Forbidden" } }) },
    });

    renderQueue();

    expect(await screen.findByText(/don't have access/i)).toBeInTheDocument();
  });

  it("AC-20: an unreachable backend shows a safe generic error, never a raw failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/v1/me")) return Promise.resolve(meResponse(staff));
        return Promise.reject(new Error("NetworkError: Failed to fetch"));
      }),
    );

    renderQueue();

    expect(await screen.findByText(/unable to load the ticket queue/i)).toBeInTheDocument();
  });
});
