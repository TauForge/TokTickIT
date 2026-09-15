import { vi } from "vitest";

export interface MockUser {
  id: number;
  email: string;
  displayName: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

// URL-substring-keyed mock, not positional sequencing: every screen now sits under
// AuthProvider, whose own /api/v1/me fetch fires alongside each screen's own effects, so a
// strict call-order assumption (Lab 2's mockFetchSequence pattern) would be fragile here.
export function mockFetchByUrl(responses: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      const key = Object.keys(responses).find((candidate) => url.includes(candidate));
      if (!key) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve(responses[key]);
    }),
  );
}

export function meResponse(user: MockUser) {
  return { ok: true, json: async () => user };
}

export function loggedOutMeResponse() {
  return { ok: false, status: 401, json: async () => ({ error: { message: "Missing or invalid session" } }) };
}
