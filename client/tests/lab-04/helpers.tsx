import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthProvider } from "../../src/api/authContext";
import { StaffTicketDetail } from "../../src/screens/StaffTicketDetail";
import { TicketDetail } from "../../src/screens/TicketDetail";
import type { MockUser } from "../lab-03/testHelpers";

export const amy: MockUser = { id: 2, email: "amy.tran@toktickit.dev", displayName: "Amy Tran", role: "IT_STAFF", mustChangePassword: false };
export const ben: MockUser = { id: 3, email: "ben.ito@toktickit.dev", displayName: "Ben Ito", role: "IT_STAFF", mustChangePassword: false };
export const admin: MockUser = { id: 9, email: "admin@toktickit.dev", displayName: "Ada Admin", role: "ADMINISTRATOR", mustChangePassword: false };
export const jennifer: MockUser = { id: 1, email: "jennifer@toktickit.dev", displayName: "Jennifer Anderson", role: "REQUESTER", mustChangePassword: false };

export const staffTicket = {
  id: "t1",
  ticketNumber: "TKT-2026-000001",
  summary: "Battery drains fast",
  description: "Drains fast even when idle.",
  categoryName: "Hardware",
  relatedSystemName: null,
  requesterId: 1,
  requesterName: "Jennifer Anderson",
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  status: "IN_PROGRESS",
  ownerId: 2,
  ownerDisplayName: "Amy Tran",
  resolvedIndicatedByRequester: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 4,
};

export function makeAction(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    ticketId: "t1",
    actionAt: "2026-01-02T03:00:00.000Z",
    description: "Replaced the battery",
    result: "Battery now holds charge",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    performedBy: { id: 2, displayName: "Amy Tran", role: "IT_STAFF" },
    createdAt: "2026-01-02T03:00:00.000Z",
    updatedAt: "2026-01-02T03:00:00.000Z",
    version: 0,
    ...overrides,
  };
}

export interface FetchCall {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
}
type Reply = { status?: number; body: unknown };
export type Handler = (call: FetchCall) => Reply | undefined;

// Handlers are tried in order; the first one returning a Reply wins. Unmatched requests return [].
export function routeFetch(me: MockUser, handlers: Handler[]) {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const call: FetchCall = {
        method: init?.method ?? "GET",
        url,
        headers: (init?.headers as Record<string, string>) ?? {},
        body: init?.body ? JSON.parse(init.body as string) : null,
      };
      calls.push(call);
      let reply: Reply | undefined;
      if (url.includes("/api/v1/me")) reply = { body: me };
      for (const handler of handlers) {
        if (reply) break;
        reply = handler(call);
      }
      reply ??= { body: [] };
      const status = reply.status ?? 200;
      return Promise.resolve({ ok: status < 400, status, json: async () => reply.body });
    }),
  );
  return calls;
}

export const on =
  (method: string, pattern: RegExp, respond: (call: FetchCall) => Reply): Handler =>
  (call) =>
    call.method === method && pattern.test(call.url) ? respond(call) : undefined;

export function renderStaffDetail() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <StaffTicketDetail ticketId="t1" />
      </MemoryRouter>
    </AuthProvider>,
  );
}

export function renderRequesterDetail() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <TicketDetail ticketId="t1" />
      </MemoryRouter>
    </AuthProvider>,
  );
}
