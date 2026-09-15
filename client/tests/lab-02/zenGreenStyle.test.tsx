import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { CreateTicket } from "../../src/screens/CreateTicket";
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
});
