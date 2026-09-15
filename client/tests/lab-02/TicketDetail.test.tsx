import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { TicketDetail } from "../../src/screens/TicketDetail";
import { mockFetchByUrl, meResponse } from "../lab-03/testHelpers";

const requester = { id: 1, email: "jennifer.anderson@toktickit.dev", displayName: "Jennifer Anderson", role: "REQUESTER" as const, mustChangePassword: false };

function renderWithRouter() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <TicketDetail ticketId="t1" />
      </MemoryRouter>
    </AuthProvider>,
  );
}

const ticket = {
  id: "t1",
  ticketNumber: "TKT-2026-000001",
  summary: "Laptop battery drains quickly",
  description: "Drains fast even when idle.",
  categoryName: "Hardware",
  relatedSystemName: null,
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  status: "NEW",
  requesterId: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("TicketDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows read-only ticket fields, attachments, and the Public Comments panel", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(requester),
      "/api/v1/tickets/t1/attachments": { ok: true, json: async () => [] },
      "/api/v1/tickets/t1/comments": { ok: true, json: async () => [] },
      "/api/v1/tickets/t1": { ok: true, json: async () => ticket },
    });

    renderWithRouter();

    await waitFor(() => expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument());
    expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument();
  });

  it("posts a new Public Comment and shows it in the list", async () => {
    let posted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/me")) return Promise.resolve(meResponse(requester));
        if (url.includes("/attachments")) return Promise.resolve({ ok: true, json: async () => [] });
        if (url.includes("/comments") && init?.method === "POST") {
          posted = true;
          return Promise.resolve({ ok: true, json: async () => ({ id: 1, ticketId: "t1", body: "Any update?", authorRole: "REQUESTER", author: { id: 1, displayName: "Jennifer Anderson" }, createdAt: "2026-01-03T00:00:00.000Z" }) });
        }
        if (url.includes("/comments")) {
          return Promise.resolve({ ok: true, json: async () => (posted ? [{ id: 1, ticketId: "t1", body: "Any update?", authorRole: "REQUESTER", author: { id: 1, displayName: "Jennifer Anderson" }, createdAt: "2026-01-03T00:00:00.000Z" }] : []) });
        }
        if (url.endsWith("/tickets/t1")) return Promise.resolve({ ok: true, json: async () => ticket });
        return Promise.resolve({ ok: true, json: async () => [] });
      }),
    );
    const user = userEvent.setup();

    renderWithRouter();
    await screen.findByText("TKT-2026-000001");

    await user.type(screen.getByLabelText(/post a comment/i), "Any update?");
    await user.click(screen.getByRole("button", { name: /post comment/i }));

    await waitFor(() => expect(screen.getByText("Any update?")).toBeInTheDocument());
  });

  it("marking Problem Appears Resolved shows the inline confirmation and hides the button", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(requester),
      "/api/v1/tickets/t1/attachments": { ok: true, json: async () => [] },
      "/api/v1/tickets/t1/comments": { ok: true, json: async () => [] },
      "/api/v1/tickets/t1/resolved-indication": { ok: true, json: async () => ({ ...ticket, resolvedIndicatedByRequester: true }) },
      "/api/v1/tickets/t1": { ok: true, json: async () => ticket },
    });
    const user = userEvent.setup();

    renderWithRouter();
    await screen.findByText("TKT-2026-000001");
    await user.click(screen.getByRole("button", { name: /problem appears resolved/i }));

    expect(await screen.findByText(/marked as resolved by you/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /problem appears resolved/i })).not.toBeInTheDocument();
  });
});
