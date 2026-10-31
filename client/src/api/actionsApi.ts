import { apiGet, apiPatch, apiPost } from "./apiClient";

export interface ActionDto {
  id: string;
  ticketId: string;
  actionAt: string;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  performedBy: { id: number; displayName: string; role: string };
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ActionInput {
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  actionAt: string;
}

async function listActions(path: string): Promise<ActionDto[]> {
  const result = await apiGet<ActionDto[]>(path);
  if (!Array.isArray(result)) throw new Error("Unexpected actions response");
  return result;
}

export function listStaffActions(ticketId: string) {
  return listActions(`/api/v1/staff/tickets/${ticketId}/actions`);
}

export function listRequesterActions(ticketId: string) {
  return listActions(`/api/v1/tickets/${ticketId}/actions`);
}

export function createAction(ticketId: string, input: ActionInput, idempotencyKey: string) {
  return apiPost<ActionDto>(`/api/v1/staff/tickets/${ticketId}/actions`, input, { "Idempotency-Key": idempotencyKey });
}

export function updateAction(ticketId: string, actionId: string, input: ActionInput, expectedVersion: number) {
  return apiPatch<ActionDto>(`/api/v1/staff/tickets/${ticketId}/actions/${actionId}`, { ...input, expectedVersion });
}

// One key per form session: generated when the form opens, reused on every retry, discarded after success.
export function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `key-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
