import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { admin, amy, ben, jennifer, makeAction, on, renderRequesterDetail, renderStaffDetail, routeFetch, staffTicket, type Handler } from "./helpers";
import type { MockUser } from "../lab-03/testHelpers";

const ticketRoutes = (actions: unknown[]): Handler[] => [
  on("GET", /\/staff\/tickets\/t1\/actions$/, () => ({ body: actions })),
  on("GET", /\/staff\/tickets\/t1$/, () => ({ body: staffTicket })),
];

async function openActionsTab(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("TKT-2026-000001");
  await user.click(screen.getByRole("tab", { name: /actions taken/i }));
}

describe("Actions Taken on Staff Ticket Detail (UI-01)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds a fourth tab with a count badge and lists actions with follow-up text badge", async () => {
    routeFetch(amy, ticketRoutes([makeAction(), makeAction({ id: "a2", description: "Ordered a spare charger", followUpRequired: true, followUpNote: "Check in a week" })]));
    const user = userEvent.setup();

    renderStaffDetail();
    await screen.findByText("TKT-2026-000001");

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    const tab = await screen.findByRole("tab", { name: /actions taken/i });
    await waitFor(() => expect(within(tab).getByText("2")).toBeInTheDocument());
    await user.click(tab);

    const panel = screen.getByRole("tabpanel", { name: /actions taken/i });
    expect(within(panel).getByText("Replaced the battery")).toBeInTheDocument();
    expect(within(panel).getByText("Follow-up needed")).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    routeFetch(amy, ticketRoutes([]));
    const user = userEvent.setup();

    renderStaffDetail();
    await openActionsTab(user);

    expect(await screen.findByText("No actions recorded yet.")).toBeInTheDocument();
  });

  it("follow-up checkbox reveals the note, Performed by is read-only 'You', empty submit shows errors with a linked summary and posts nothing", async () => {
    const calls = routeFetch(amy, ticketRoutes([]));
    const user = userEvent.setup();

    renderStaffDetail();
    await openActionsTab(user);
    await user.click(await screen.findByRole("button", { name: /add action/i }));

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.queryByLabelText(/follow-up note/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/follow-up required/i));
    expect(screen.getByLabelText(/follow-up note/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /save action/i }));

    expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/actions"))).toBe(false);
    const summary = screen.getByRole("alert");
    const link = within(summary).getByRole("link", { name: /description is required/i });
    expect(link).toHaveAttribute("href", "#action-description");
    expect(screen.getByLabelText(/^description/i)).toHaveAccessibleDescription(/description is required/i);
    expect(screen.getByLabelText(/follow-up note/i)).toHaveAccessibleDescription(/follow-up note is required/i);
  });

  it("creates an action with an Idempotency-Key, keeps the typed data on a server error, and reuses the same key on retry", async () => {
    let attempts = 0;
    let created = false;
    const calls = routeFetch(amy, [
      on("POST", /\/staff\/tickets\/t1\/actions$/, () => {
        attempts += 1;
        if (attempts === 1) return { status: 500, body: { error: { message: "Boom" } } };
        created = true;
        return { status: 201, body: makeAction({ id: "new", description: "Reset the OS" }) };
      }),
      (call) => (call.method === "GET" && /\/actions$/.test(call.url) ? { body: created ? [makeAction({ id: "new", description: "Reset the OS" })] : [] } : undefined),
      on("GET", /\/staff\/tickets\/t1$/, () => ({ body: staffTicket })),
    ]);
    const user = userEvent.setup();

    renderStaffDetail();
    await openActionsTab(user);
    await user.click(await screen.findByRole("button", { name: /add action/i }));
    await user.type(screen.getByLabelText(/^description/i), "Reset the OS");
    await user.type(screen.getByLabelText(/^result/i), "Boots clean");
    await user.click(screen.getByRole("button", { name: /save action/i }));

    expect(await screen.findByText(/unable to save this action/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description/i)).toHaveValue("Reset the OS");
    expect(screen.getByRole("button", { name: /save action/i })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /save action/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/action saved/i));
    const posts = calls.filter((c) => c.method === "POST");
    expect(posts).toHaveLength(2);
    expect(posts[0].headers["Idempotency-Key"]).toBeTruthy();
    expect(posts[1].headers["Idempotency-Key"]).toBe(posts[0].headers["Idempotency-Key"]);
    expect(posts[0].body).toMatchObject({ description: "Reset the OS", result: "Boots clean", followUpRequired: false });
    expect(posts[0].body).not.toHaveProperty("performedBy");
    expect(await screen.findByText("Reset the OS", { selector: "td, p, span" })).toBeInTheDocument();
  });

  it("locks the submit button while a save is in flight", async () => {
    let release: (() => void) | undefined;
    let postCount = 0;
    routeFetch(amy, ticketRoutes([]));
    const original = globalThis.fetch as unknown as (url: string, init?: RequestInit) => Promise<unknown>;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          postCount += 1;
          return new Promise((resolve) => {
            release = () => resolve({ ok: true, status: 201, json: async () => makeAction() });
          });
        }
        return original(url, init);
      }),
    );
    const user = userEvent.setup();

    renderStaffDetail();
    await openActionsTab(user);
    await user.click(await screen.findByRole("button", { name: /add action/i }));
    await user.type(screen.getByLabelText(/^description/i), "x");
    await user.type(screen.getByLabelText(/^result/i), "y");
    await user.click(screen.getByRole("button", { name: /save action/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled());
    // A second submit while the first is pending (Enter key, fast double click) must not send another POST.
    fireEvent.submit(screen.getByRole("form", { name: /add action/i }));
    fireEvent.submit(screen.getByRole("form", { name: /add action/i }));
    release?.();
    expect(postCount).toBe(1);
  });

  async function openFirstAction(me: MockUser, performerId: number) {
    routeFetch(me, ticketRoutes([makeAction({ performedBy: { id: performerId, displayName: "Amy Tran", role: "IT_STAFF" } })]));
    const user = userEvent.setup();
    renderStaffDetail();
    await openActionsTab(user);
    await user.click(await screen.findByRole("button", { name: /view action/i }));
    return user;
  }

  it("disables Edit with the specified tooltip for a staff member who is not the performer", async () => {
    await openFirstAction(ben, 2);

    const edit = screen.getByRole("button", { name: /^edit/i });
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute("title", "Only the person who recorded this action or an Administrator can edit it.");
  });

  it("enables Edit for the performer and for an Administrator", async () => {
    await openFirstAction(amy, 2);
    expect(screen.getByRole("button", { name: /^edit/i })).toBeEnabled();
    vi.unstubAllGlobals();
  });

  it("enables Edit for an Administrator who is not the performer", async () => {
    await openFirstAction(admin, 2);
    expect(screen.getByRole("button", { name: /^edit/i })).toBeEnabled();
  });

  it("saves an edit with expectedVersion", async () => {
    const calls = routeFetch(amy, [
      on("PATCH", /\/actions\/a1$/, () => ({ body: makeAction({ result: "Fixed", version: 1 }) })),
      ...ticketRoutes([makeAction()]),
    ]);
    const user = userEvent.setup();

    renderStaffDetail();
    await openActionsTab(user);
    await user.click(await screen.findByRole("button", { name: /view action/i }));
    await user.click(screen.getByRole("button", { name: /^edit/i }));
    const result = screen.getByLabelText(/^result/i);
    await user.clear(result);
    await user.type(result, "Fixed");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.body).toMatchObject({ expectedVersion: 0, result: "Fixed" });
  });

  it("a stale 409 shows the callout, and Reload resets the form to the latest values while keeping the typed text visible", async () => {
    let listCalls = 0;
    routeFetch(amy, [
      on("PATCH", /\/actions\/a1$/, () => ({ status: 409, body: { error: { code: "STALE_UPDATE", message: "changed", currentVersion: 3 } } })),
      (call) => {
        if (call.method === "GET" && /\/actions$/.test(call.url)) {
          listCalls += 1;
          return { body: [listCalls > 1 ? makeAction({ version: 3, result: "Colleague's newer result" }) : makeAction()] };
        }
        return undefined;
      },
      on("GET", /\/staff\/tickets\/t1$/, () => ({ body: staffTicket })),
    ]);
    const user = userEvent.setup();

    renderStaffDetail();
    await openActionsTab(user);
    await user.click(await screen.findByRole("button", { name: /view action/i }));
    await user.click(screen.getByRole("button", { name: /^edit/i }));
    const result = screen.getByLabelText(/^result/i);
    await user.clear(result);
    await user.type(result, "My typed text");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Someone changed this. Reload to see the latest.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^result/i)).toHaveValue("My typed text");
    await user.click(screen.getByRole("button", { name: /reload/i }));
    await waitFor(() => expect(listCalls).toBeGreaterThan(1));
    // Review on PR #52: Save must not be able to replace the other person's edit unseen.
    await waitFor(() => expect(screen.getByLabelText(/^result/i)).toHaveValue("Colleague's newer result"));
    expect(screen.getByText(/My typed text/, { selector: "li" })).toBeInTheDocument();
    expect(screen.getByText(/showing the latest saved values/i)).toBeInTheDocument();
  });

  it("editing the description does not send actionAt, so stored seconds are not rewritten", async () => {
    const calls = routeFetch(amy, [
      on("PATCH", /\/actions\/a1$/, () => ({ body: makeAction({ description: "Reworded", version: 1 }) })),
      ...ticketRoutes([makeAction({ actionAt: "2026-01-02T03:00:42.000Z" })]),
    ]);
    const user = userEvent.setup();

    renderStaffDetail();
    await openActionsTab(user);
    await user.click(await screen.findByRole("button", { name: /view action/i }));
    await user.click(screen.getByRole("button", { name: /^edit/i }));
    const description = screen.getByLabelText(/^description/i);
    await user.clear(description);
    await user.type(description, "Reworded");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.body).toMatchObject({ description: "Reworded", expectedVersion: 0 });
    expect(patch.body).not.toHaveProperty("actionAt");
  });

  it("never renders a delete control", async () => {
    await openFirstAction(admin, 2);
    expect(screen.queryByRole("button", { name: /delete|remove/i })).not.toBeInTheDocument();
  });
});

describe("Actions Taken on Requester Ticket Detail (UI-01)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a read-only Actions Taken list with no Add or Edit controls", async () => {
    routeFetch(jennifer, [
      on("GET", /\/api\/v1\/tickets\/t1\/actions$/, () => ({ body: [makeAction({ followUpRequired: true, followUpNote: "Check in a week" })] })),
      on("GET", /\/api\/v1\/tickets\/t1$/, () => ({
        body: { id: "t1", ticketNumber: "TKT-2026-000001", summary: "s", description: "d", categoryName: "Hardware", relatedSystemName: null, requestedPriority: "MEDIUM", itPriority: "MEDIUM", status: "IN_PROGRESS", requesterId: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 2 },
      })),
    ]);

    renderRequesterDetail();

    const heading = await screen.findByRole("heading", { name: /actions taken/i });
    expect(heading).toBeInTheDocument();
    expect(await screen.findByText("Replaced the battery")).toBeInTheDocument();
    expect(screen.getByText("Follow-up needed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add action/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit/i })).not.toBeInTheDocument();
  });
});
