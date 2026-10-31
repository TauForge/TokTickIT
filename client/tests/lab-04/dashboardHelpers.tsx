import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/api/authContext";
import { RequesterDashboard } from "../../src/screens/RequesterDashboard";
import { StaffDashboard } from "../../src/screens/StaffDashboard";

export const staffDashboard = {
  counts: {
    new: 3,
    open: 4,
    inProgress: 5,
    waitingForRequester: 2,
    myAssigned: 6,
    unassigned: 7,
    byItPriority: { LOW: 1, MEDIUM: 8, HIGH: 2 },
  },
  urgent: [
    { id: "u1", ticketNumber: "TKT-2026-000010", summary: "Server room offline", status: "OPEN", itPriority: "HIGH", ownerDisplayName: null, updatedAt: "2026-01-03T00:00:00.000Z" },
  ],
  recentlyUpdated: [
    { id: "r1", ticketNumber: "TKT-2026-000011", summary: "Printer jam", status: "IN_PROGRESS", itPriority: "MEDIUM", ownerDisplayName: "Amy Tran", updatedAt: "2026-01-04T00:00:00.000Z" },
  ],
  myRecentActions: [
    { id: "a1", ticketId: "t5", ticketNumber: "TKT-2026-000012", description: "Swapped the toner", actionAt: "2026-01-04T02:00:00.000Z" },
  ],
  generatedAt: "2026-01-04T03:00:00.000Z",
};

export const emptyStaffDashboard = {
  counts: { new: 0, open: 0, inProgress: 0, waitingForRequester: 0, myAssigned: 0, unassigned: 0, byItPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 } },
  urgent: [],
  recentlyUpdated: [],
  myRecentActions: [],
  generatedAt: "2026-01-04T03:00:00.000Z",
};

export const requesterDashboard = {
  counts: { myOpen: 4, inProgress: 2, waitingForMe: 1, resolved: 3, closed: 9 },
  recentlyUpdated: [{ id: "q1", ticketNumber: "TKT-2026-000020", summary: "VPN will not connect", status: "WAITING_FOR_REQUESTER", updatedAt: "2026-01-04T00:00:00.000Z" }],
  recentlyResolved: [{ id: "q2", ticketNumber: "TKT-2026-000021", summary: "Mouse replaced", status: "RESOLVED", updatedAt: "2026-01-03T00:00:00.000Z" }],
  generatedAt: "2026-01-04T03:00:00.000Z",
};

export const emptyRequesterDashboard = {
  counts: { myOpen: 0, inProgress: 0, waitingForMe: 0, resolved: 0, closed: 0 },
  recentlyUpdated: [],
  recentlyResolved: [],
  generatedAt: "2026-01-04T03:00:00.000Z",
};

export function renderStaffDashboard() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <StaffDashboard />
      </MemoryRouter>
    </AuthProvider>,
  );
}

export function renderRequesterDashboard() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <RequesterDashboard />
      </MemoryRouter>
    </AuthProvider>,
  );
}
