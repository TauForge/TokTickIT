import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { CreateTicket } from "../../src/screens/CreateTicket";
import { StatusBadge } from "../../src/components/badges";
import { mockFetchByUrl, meResponse } from "../lab-03/testHelpers";

describe("Zen Green style contract", () => {
  it("Create Ticket required fields carry a visible asterisk and the form uses zg-card", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse({ id: 1, email: "jennifer.anderson@toktickit.dev", displayName: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false }),
    });

    render(
      <AuthProvider>
        <CreateTicket onCreated={() => {}} />
      </AuthProvider>,
    );

    await screen.findByText("Jennifer Anderson");
    const summaryLabel = screen.getByText(/^summary/i).closest("label");
    expect(summaryLabel?.textContent).toContain("*");
    expect(document.querySelector("form.zg-card")).not.toBeNull();
    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled();
  });

  it("Lab 3: every non-NEW status renders its own label, never the raw enum value", () => {
    const statuses = ["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
    statuses.forEach((status) => {
      const { container, unmount } = render(<StatusBadge value={status} />);
      expect(container.textContent).not.toBe(status);
      unmount();
    });
  });
});
