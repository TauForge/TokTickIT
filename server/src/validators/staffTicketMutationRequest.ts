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
