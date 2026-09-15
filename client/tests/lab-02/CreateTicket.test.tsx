import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { CreateTicket } from "../../src/screens/CreateTicket";
import { mockFetchByUrl, meResponse } from "../lab-03/testHelpers";

const requester = { id: 1, email: "jennifer.anderson@toktickit.dev", displayName: "Jennifer Anderson", role: "REQUESTER" as const, mustChangePassword: false };

function renderCreateTicket(onCreated = vi.fn()) {
  render(
    <AuthProvider>
      <CreateTicket onCreated={onCreated} />
    </AuthProvider>,
  );
  return onCreated;
}

describe("CreateTicket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a field error and never calls POST /api/tickets when Summary is missing", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        calls.push(url);
        if (url.includes("/api/v1/me")) return Promise.resolve(meResponse(requester));
        if (url.includes("/api/categories")) return Promise.resolve({ ok: true, json: async () => [{ id: 1, name: "Hardware", code: "HARDWARE" }] });
        return Promise.resolve({ ok: true, json: async () => [] });
      }),
    );
    const user = userEvent.setup();

    renderCreateTicket();

    await screen.findByLabelText(/category/i);
    await user.type(screen.getByLabelText(/description/i), "0123456789");
    await user.selectOptions(screen.getByLabelText(/^category/i), "1");
    await user.selectOptions(screen.getByLabelText(/requested priority/i), "MEDIUM");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/summary must be/i)).toBeInTheDocument();
    expect(calls.some((c) => c.includes("/api/tickets") && !c.includes("/api/v1"))).toBe(false);
  });

  it("shows the current Requester read-only, then hands the created ticket to onCreated on success", async () => {
    mockFetchByUrl({
      "/api/v1/me": meResponse(requester),
      "/api/categories": { ok: true, json: async () => [{ id: 1, name: "Hardware", code: "HARDWARE" }] },
      "/api/v1/tickets": { ok: true, json: async () => ({ id: "t1", ticketNumber: "TKT-2026-000001" }) },
    });
    const onCreated = vi.fn();
    const user = userEvent.setup();

    renderCreateTicket(onCreated);

    expect(await screen.findByText("Jennifer Anderson")).toBeInTheDocument();

    await screen.findByLabelText(/category/i);
    await user.type(screen.getByLabelText(/^summary/i), "Laptop battery drains quickly");
    await user.type(screen.getByLabelText(/description/i), "Battery drains within two hours idle.");
    await user.selectOptions(screen.getByLabelText(/^category/i), "1");
    await user.selectOptions(screen.getByLabelText(/requested priority/i), "MEDIUM");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: "t1", ticketNumber: "TKT-2026-000001" }));
  });
});
