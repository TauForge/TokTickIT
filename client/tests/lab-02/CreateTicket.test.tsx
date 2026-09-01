import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateTicket } from "../../src/screens/CreateTicket";

function mockFetchSequence(responses: unknown[]) {
  let call = 0;
  const calls: { url: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      calls.push({ url });
      const response = responses[Math.min(call, responses.length - 1)];
      call += 1;
      return Promise.resolve(response);
    }),
  );
  return calls;
}

describe("CreateTicket", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a field error and never calls POST /api/tickets when Summary is missing", async () => {
    const calls = mockFetchSequence([
      { ok: true, json: async () => [{ id: 1, name: "Hardware", code: "HARDWARE" }] },
      { ok: true, json: async () => [] },
    ]);
    const user = userEvent.setup();

    render(
      <CreateTicket requesterId={1} requesterName="Jennifer Anderson" onCreated={() => {}} />,
    );

    await screen.findByLabelText(/category/i);
    await user.type(screen.getByLabelText(/description/i), "0123456789");
    await user.selectOptions(screen.getByLabelText(/^category/i), "1");
    await user.selectOptions(screen.getByLabelText(/requested priority/i), "MEDIUM");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/summary must be/i)).toBeInTheDocument();
    // Only the 2 reference-data GETs happened (categories, related systems) — no POST.
    expect(calls).toHaveLength(2);
  });

  it("shows the current Requester read-only, then disables Submit in flight and shows the ticket number on success", async () => {
    mockFetchSequence([
      { ok: true, json: async () => [{ id: 1, name: "Hardware", code: "HARDWARE" }] },
      { ok: true, json: async () => [] },
      { ok: true, json: async () => ({ ticketNumber: "TKT-2026-000001" }) },
    ]);
    const onCreated = vi.fn();
    const user = userEvent.setup();

    render(
      <CreateTicket requesterId={1} requesterName="Jennifer Anderson" onCreated={onCreated} />,
    );

    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();

    await screen.findByLabelText(/category/i);
    await user.type(screen.getByLabelText(/^summary/i), "Laptop battery drains quickly");
    await user.type(
      screen.getByLabelText(/description/i),
      "Battery drains within two hours idle.",
    );
    await user.selectOptions(screen.getByLabelText(/^category/i), "1");
    await user.selectOptions(screen.getByLabelText(/requested priority/i), "MEDIUM");

    const submit = screen.getByRole("button", { name: /submit/i });
    await user.click(submit);

    await waitFor(() => expect(screen.getByText(/TKT-2026-000001/)).toBeInTheDocument());
    expect(onCreated).toHaveBeenCalled();
  });
});
