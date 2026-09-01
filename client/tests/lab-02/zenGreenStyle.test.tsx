import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CreateTicket } from "../../src/screens/CreateTicket";

describe("Zen Green style contract", () => {
  it("Create Ticket required fields carry a visible asterisk and the form uses zg-card", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(
      <CreateTicket requesterId={1} requesterName="Jennifer Anderson" onCreated={() => {}} />,
    );

    const summaryLabel = screen.getByText(/^summary/i).closest("label");
    expect(summaryLabel?.textContent).toContain("*");
    expect(document.querySelector("form.zg-card")).not.toBeNull();
    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled();
  });
});
