import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { StaffTicketDetail } from "../../src/screens/StaffTicketDetail";
import { mockFetchByUrl, meResponse } from "./testHelpers";

const staff = { id: 2, email: "amy.tran@toktickit.dev", displayName: "Amy Tran", role: "IT_STAFF" as const, mustChangePassword: false };

const ticket = {
  id: "t1",
  ticketNumber: "TKT-2026-000001",
  summary: "Battery drains fast",
  description: "Drains fast even when idle.",
  categoryName: "Hardware",
  relatedSystemName: null,
  requesterId: 1,
  requesterName: "Jennifer Anderson",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  status: "OPEN",
  ownerId: 2,
  ownerDisplayName: "Amy Tran",
  resolvedIndicatedByRequester: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderDetail() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <StaffTicketDetail ticketId="t1" />
      </MemoryRouter>
    </AuthProvider>,
  );
}

function baseMocks(overrides: Record<string, unknown> = {}) {
  return {
    "/api/v1/me": meResponse(staff),
    "/api/v1/staff/tickets/t1/attachments": { ok: true, json: async () => [] },
    "/api/v1/staff/tickets/t1/comments": { ok: true, json: async () => [] },
    "/api/v1/staff/tickets/t1/notes": { ok: true, json: async () => [] },
    "/api/v1/staff/assignable-owners": { ok: true, json: async () => [{ id: 2, displayName: "Amy Tran", role: "IT_STAFF" }] },
    "/api/v1/staff/tickets/t1": { ok: true, json: async () => ticket },
    ...overrides,
  };
}

describe("StaffTicketDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders read-only fields plus the three editable controls and the tinted panel tabs", async () => {
    mockFetchByUrl(baseMocks());

    renderDetail();

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());
    expect(screen.getByLabelText(/ticket owner/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/it priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current status/i)).toBeInTheDocument();
    expect(screen.getByTestId("public-comments-panel")).toBeInTheDocument();
    expect(screen.getByTestId("internal-notes-panel")).toBeInTheDocument();
    expect(screen.getByText(/internal.*not visible to requester/i)).toBeInTheDocument();
  });

  it("changing IT Priority calls the priority PATCH and shows the updated value", async () => {
    let patched = false;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/me")) return Promise.resolve(meResponse(staff));
        if (url.endsWith("/priority") && init?.method === "PATCH") {
          patched = true;
          return Promise.resolve({ ok: true, json: async () => ({ ...ticket, itPriority: "HIGH" }) });
        }
        if (url.endsWith("/t1")) return Promise.resolve({ ok: true, json: async () => (patched ? { ...ticket, itPriority: "HIGH" } : ticket) });
        if (url.includes("/attachments")) return Promise.resolve({ ok: true, json: async () => [] });
        if (url.includes("/comments")) return Promise.resolve({ ok: true, json: async () => [] });
        if (url.includes("/notes")) return Promise.resolve({ ok: true, json: async () => [] });
        if (url.includes("/assignable-owners")) return Promise.resolve({ ok: true, json: async () => [{ id: 2, displayName: "Amy Tran", role: "IT_STAFF" }] });
        return Promise.resolve({ ok: true, json: async () => [] });
      }),
    );
    const user = userEvent.setup();

    renderDetail();
    await screen.findByText("TKT-2026-000001");
    await user.selectOptions(screen.getByLabelText(/it priority/i), "HIGH");

    await waitFor(() => expect(screen.getByLabelText(/it priority/i)).toHaveValue("HIGH"));
  });

  it("a 409 TICKET_LOCKED on a status change shows an inline callout and reverts to the last known-good value", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/me")) return Promise.resolve(meResponse(staff));
        if (url.endsWith("/status") && init?.method === "PATCH") {
          return Promise.resolve({ ok: false, status: 409, json: async () => ({ error: { code: "TICKET_LOCKED", message: "This ticket is locked and its status cannot change" } }) });
        }
        if (url.endsWith("/t1")) return Promise.resolve({ ok: true, json: async () => ticket });
        if (url.includes("/attachments")) return Promise.resolve({ ok: true, json: async () => [] });
        if (url.includes("/comments")) return Promise.resolve({ ok: true, json: async () => [] });
        if (url.includes("/notes")) return Promise.resolve({ ok: true, json: async () => [] });
        if (url.includes("/assignable-owners")) return Promise.resolve({ ok: true, json: async () => [{ id: 2, displayName: "Amy Tran", role: "IT_STAFF" }] });
        return Promise.resolve({ ok: true, json: async () => [] });
      }),
    );
    const user = userEvent.setup();

    renderDetail();
    await screen.findByText("TKT-2026-000001");
    await user.selectOptions(screen.getByLabelText(/current status/i), "RESOLVED");

    expect(await screen.findByText(/locked/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/current status/i)).toHaveValue("OPEN"));
  });

  it("posts an Internal Note and shows it only in the Internal Notes panel", async () => {
    mockFetchByUrl(
      baseMocks({
        "/api/v1/staff/tickets/t1/notes": { ok: true, json: async () => [] },
      }),
    );
    let notePosted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/me")) return Promise.resolve(meResponse(staff));
        if (url.endsWith("/notes") && init?.method === "POST") {
          notePosted = true;
          return Promise.resolve({ ok: true, json: async () => ({ id: 1, ticketId: "t1", body: "Vendor RMA pending.", author: { id: 2, displayName: "Amy Tran" }, createdAt: "2026-01-03T00:00:00.000Z" }) });
        }
        if (url.endsWith("/notes")) return Promise.resolve({ ok: true, json: async () => (notePosted ? [{ id: 1, ticketId: "t1", body: "Vendor RMA pending.", author: { id: 2, displayName: "Amy Tran" }, createdAt: "2026-01-03T00:00:00.000Z" }] : []) });
        if (url.endsWith("/t1")) return Promise.resolve({ ok: true, json: async () => ticket });
        if (url.includes("/attachments")) return Promise.resolve({ ok: true, json: async () => [] });
        if (url.includes("/comments")) return Promise.resolve({ ok: true, json: async () => [] });
        if (url.includes("/assignable-owners")) return Promise.resolve({ ok: true, json: async () => [{ id: 2, displayName: "Amy Tran", role: "IT_STAFF" }] });
        return Promise.resolve({ ok: true, json: async () => [] });
      }),
    );
    const user = userEvent.setup();

    renderDetail();
    await screen.findByText("TKT-2026-000001");
    await user.type(screen.getByLabelText(/add an internal note/i), "Vendor RMA pending.");
    await user.click(screen.getByRole("button", { name: /post note/i }));

    await waitFor(() => expect(screen.getByTestId("internal-notes-panel")).toHaveTextContent("Vendor RMA pending."));
    expect(screen.getByTestId("public-comments-panel")).not.toHaveTextContent("Vendor RMA pending.");
  });
});
