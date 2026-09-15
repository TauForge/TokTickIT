import { FieldError } from "../middleware/errorEnvelope";

export interface OwnerRequestInput {
  ownerId: number;
}
export type OwnerValidationResult = { ok: true; value: OwnerRequestInput } | { ok: false; errors: FieldError[] };

export function validateOwnerRequest(body: unknown): OwnerValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const ownerId = typeof b.ownerId === "number" ? b.ownerId : NaN;
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    return { ok: false, errors: [{ field: "ownerId", message: "A valid owner is required." }] };
  }
  return { ok: true, value: { ownerId } };
}

export interface PriorityRequestInput {
  itPriority: "LOW" | "MEDIUM" | "HIGH";
}
export type PriorityValidationResult = { ok: true; value: PriorityRequestInput } | { ok: false; errors: FieldError[] };

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export function validatePriorityRequest(body: unknown): PriorityValidationResult {
  const b = (body ?? {}) as Record<string, unknown>;
  const itPriority = typeof b.itPriority === "string" ? b.itPriority : "";
  if (!PRIORITIES.includes(itPriority)) {
    return { ok: false, errors: [{ field: "itPriority", message: "IT Priority must be Low, Medium, or High." }] };
  }
  return { ok: true, value: { itPriority: itPriority as PriorityRequestInput["itPriority"] } };
}
