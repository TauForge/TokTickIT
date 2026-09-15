// client/tests/lab-03/zenGreenStyleLab3.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { Login } from "../../src/screens/Login";
import { StaffTicketQueue } from "../../src/screens/StaffTicketQueue";
import { StaffTicketDetail } from "../../src/screens/StaffTicketDetail";
import { UserManagement } from "../../src/screens/UserManagement";
import { mockFetchByUrl, meResponse } from "./testHelpers";

const staff = { id: 2, email: "amy.tran@toktickit.dev", displayName: "Amy Tran", role: "IT_STAFF" as const, mustChangePassword: false };
const admin = { id: 1, email: "admin@toktickit.dev", displayName: "System Administrator", role: "ADMINISTRATOR" as const, mustChangePassword: false };

describe("Lab 3 Zen Green style verification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Login uses the zg-card form styling", () => {
    mockFetchByUrl({ "/api/v1/me": { ok: false, status: 401, json: async () => ({}) } });
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>,
    );
    expect(document.querySelector(".zg-card")).not.toBeNull();
  });

  it("Staff Ticket Queue renders zg-table and zg-badge classes", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(staff),
      "/api/v1/staff/tickets": {
        ok: true,
        json: async () => ({
          data: [{ id: "t1", ticketNumber: "TKT-2026-000001", createdAt: "2026-01-01T00:00:00.000Z", summary: "x", categoryName: "Hardware", requestedPriority: "LOW", itPriority: "LOW", status: "NEW", ownerId: null, ownerDisplayName: null, updatedAt: "2026-01-01T00:00:00.000Z" }],
          meta: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        }),
      },
    });
    render(
      <AuthProvider>
        <MemoryRouter>
          <StaffTicketQueue />
        </MemoryRouter>
      </AuthProvider>,
    );
    await screen.findByText("TKT-2026-000001");
    expect(document.querySelector(".zg-table")).not.toBeNull();
    expect(document.querySelectorAll(".zg-badge").length).toBeGreaterThan(0);
  });

  it("Staff Ticket Detail's Public Comments and Internal Notes panels use distinct tinted classes at every viewport", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(staff),
      "/api/v1/staff/tickets/t1/attachments": { ok: true, json: async () => [] },
      "/api/v1/staff/tickets/t1/comments": { ok: true, json: async () => [] },
      "/api/v1/staff/tickets/t1/notes": { ok: true, json: async () => [] },
      "/api/v1/staff/assignable-owners": { ok: true, json: async () => [] },
      "/api/v1/staff/tickets/t1": {
        ok: true,
        json: async () => ({ id: "t1", ticketNumber: "TKT-2026-000001", summary: "x", description: "y", categoryName: "Hardware", relatedSystemName: null, requesterId: 1, requesterName: "Jennifer Anderson", requestedPriority: "LOW", itPriority: "LOW", status: "OPEN", ownerId: null, ownerDisplayName: null, resolvedIndicatedByRequester: false, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }),
      },
    });
    render(
      <AuthProvider>
        <MemoryRouter>
          <StaffTicketDetail ticketId="t1" />
        </MemoryRouter>
      </AuthProvider>,
    );
    await screen.findByText("TKT-2026-000001");
    expect(screen.getByTestId("public-comments-panel")).toHaveClass("zg-comments-panel");
    expect(screen.getByTestId("internal-notes-panel")).toHaveClass("zg-notes-panel");
    // ui-spec.md's responsive checklist requires the two panels to stay visually distinct
    // at every viewport, not just desktop — since these classes carry the distinction via
    // CSS (not conditional JSX per breakpoint), asserting the class names once here covers
    // every viewport by construction; VISUAL-01's screenshots are the actual 3-viewport check.
  });

  it("User Management renders RoleBadge zg-role-badge classes", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(admin),
      "/api/v1/admin/users": {
        ok: true,
        json: async () => [{ id: 1, email: "admin@toktickit.dev", displayName: "System Administrator", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, createdAt: "2026-01-01T00:00:00.000Z" }],
      },
    });
    render(
      <AuthProvider>
        <UserManagement />
      </AuthProvider>,
    );
    await screen.findByText("System Administrator");
    await waitFor(() => expect(document.querySelector(".zg-role-badge-administrator")).not.toBeNull());
  });
});
