import { FieldError } from "../middleware/errorEnvelope";

export interface CommentBodyInput {
  body: string;
}
export type CommentBodyValidationResult =
  | { ok: true; value: CommentBodyInput }
  | { ok: false; errors: FieldError[] };

const MAX_LENGTH = 2000;

// BR-21: shared by Requester Public Comments (this task) and Task 20's staff Comments and
// Internal Notes routes — empty/whitespace-only rejected with 422, content capped at 2000.
export function validateCommentBody(raw: unknown): CommentBodyValidationResult {
  const b = (raw ?? {}) as Record<string, unknown>;
  const body = typeof b.body === "string" ? b.body.trim() : "";
  if (!body) {
    return { ok: false, errors: [{ field: "body", message: "Content is required." }] };
  }
  if (body.length > MAX_LENGTH) {
    return { ok: false, errors: [{ field: "body", message: `Content must be ${MAX_LENGTH} characters or fewer.` }] };
  }
  return { ok: true, value: { body } };
}
