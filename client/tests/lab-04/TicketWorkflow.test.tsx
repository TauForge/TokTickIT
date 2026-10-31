import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { amy, on, renderStaffDetail, routeFetch, staffTicket, type Handler } from "./helpers";

const base = (ticket = staffTicket): Handler[] => [on("GET", /\/staff\/tickets\/t1$/, () => ({ body: ticket }))];

function optionValues(select: HTMLElement) {
  return within(select).getAllByRole("option").map((o) => (o as HTMLOptionElement).value);
}

describe("Ticket workflow feedback (UI-02)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("status select offers only the permitted next statuses (plus the current one)", async () => {
    routeFetch(amy, base({ ...staffTicket, status: "OPEN" }));

    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");

    expect(optionValues(screen.getByLabelText(/current status/i))).toEqual(["OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"]);
  });

  it("offers In Progress and Waiting for Requester from Reopened (no dead end)", async () => {
    routeFetch(amy, base({ ...staffTicket, status: "REOPENED" }));

    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");

    expect(optionValues(screen.getByLabelText(/current status/i))).toEqual(["REOPENED", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"]);
  });

  it("sends expectedVersion on owner, priority and status writes", async () => {
    const calls = routeFetch(amy, [
      on("PATCH", /\/priority$/, () => ({ body: { ...staffTicket, itPriority: "HIGH", version: 5 } })),
      on("PATCH", /\/status$/, () => ({ body: { ...staffTicket, status: "WAITING_FOR_REQUESTER", version: 6 } })),
      ...base(),
    ]);
    const user = userEvent.setup();

    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");
    await user.selectOptions(screen.getByLabelText(/it priority/i), "HIGH");
    await waitFor(() => expect(screen.getByLabelText(/it priority/i)).toHaveValue("HIGH"));
    await user.selectOptions(screen.getByLabelText(/current status/i), "WAITING_FOR_REQUESTER");
    await waitFor(() => expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(2));

    const [priority, status] = calls.filter((c) => c.method === "PATCH");
    expect(priority.body).toEqual({ itPriority: "HIGH", expectedVersion: 4 });
    expect(status.body).toEqual({ status: "WAITING_FOR_REQUESTER", expectedVersion: 5 });
  });

  it("a successful status change refreshes the summary badge without a reload", async () => {
    routeFetch(amy, [on("PATCH", /\/status$/, () => ({ body: { ...staffTicket, status: "WAITING_FOR_REQUESTER", version: 5 } })), ...base()]);
    const user = userEvent.setup();

    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");
    expect(screen.getByTestId("status-badge")).toHaveTextContent("In Progress");
    await user.selectOptions(screen.getByLabelText(/current status/i), "WAITING_FOR_REQUESTER");

    await waitFor(() => expect(screen.getByTestId("status-badge")).toHaveTextContent("Waiting for Requester"));
    expect(screen.getByLabelText(/current status/i)).toHaveValue("WAITING_FOR_REQUESTER");
  });

  it("Resolved with no Actions shows the gate callout and the select reverts", async () => {
    routeFetch(amy, [
      on("PATCH", /\/status$/, () => ({ status: 409, body: { error: { code: "RESOLUTION_REQUIRES_ACTION", message: "gate" } } })),
      ...base(),
    ]);
    const user = userEvent.setup();

    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");
    await user.selectOptions(screen.getByLabelText(/current status/i), "RESOLVED");

    expect(await screen.findByText("Record at least one action before resolving.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/current status/i)).toHaveValue("IN_PROGRESS"));
    expect(screen.getByTestId("status-badge")).toHaveTextContent("In Progress");
  });

  it("a stale 409 shows an inline callout with Reload, reverts, and Reload fetches the latest version", async () => {
    let ticketGets = 0;
    routeFetch(amy, [
      on("PATCH", /\/status$/, () => ({ status: 409, body: { error: { code: "STALE_UPDATE", message: "changed", currentVersion: 9 } } })),
      (call) => {
        if (call.method === "GET" && /\/staff\/tickets\/t1$/.test(call.url)) {
          ticketGets += 1;
          return { body: ticketGets > 1 ? { ...staffTicket, status: "WAITING_FOR_REQUESTER", version: 9 } : staffTicket };
        }
        return undefined;
      },
    ]);
    const user = userEvent.setup();

    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");
    await user.selectOptions(screen.getByLabelText(/current status/i), "RESOLVED");

    expect(await screen.findByText(/someone changed this ticket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current status/i)).toHaveValue("IN_PROGRESS");
    await user.click(screen.getByRole("button", { name: /reload/i }));
    await waitFor(() => expect(screen.getByTestId("status-badge")).toHaveTextContent("Waiting for Requester"));
  });

  it("an invalid-transition 409 shows the server message and reverts", async () => {
    routeFetch(amy, [
      on("PATCH", /\/status$/, () => ({ status: 409, body: { error: { code: "INVALID_STATUS_TRANSITION", message: "That status change is not allowed" } } })),
      ...base(),
    ]);
    const user = userEvent.setup();

    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");
    await user.selectOptions(screen.getByLabelText(/current status/i), "WAITING_FOR_REQUESTER");

    expect(await screen.findByText("That status change is not allowed")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/current status/i)).toHaveValue("IN_PROGRESS"));
  });

  it("disables owner, priority and status while a write is in flight, so two changes cannot share one expectedVersion", async () => {
    let release: (() => void) | undefined;
    let patches = 0;
    routeFetch(amy, base({ ...staffTicket, status: "OPEN" }));
    const original = globalThis.fetch as unknown as (url: string, init?: RequestInit) => Promise<unknown>;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          patches += 1;
          return new Promise((resolve) => {
            release = () => resolve({ ok: true, status: 200, json: async () => ({ ...staffTicket, status: "OPEN", itPriority: "HIGH", version: 1 }) });
          });
        }
        return original(url, init);
      }),
    );
    const user = userEvent.setup();

    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");
    await user.selectOptions(screen.getByLabelText(/it priority/i), "HIGH");

    await waitFor(() => expect(screen.getByLabelText(/current status/i)).toBeDisabled());
    expect(screen.getByLabelText(/it priority/i)).toBeDisabled();
    expect(screen.getByLabelText(/ticket owner/i)).toBeDisabled();
    expect(patches).toBe(1);

    release?.();
    await waitFor(() => expect(screen.getByLabelText(/current status/i)).toBeEnabled());
  });
});
