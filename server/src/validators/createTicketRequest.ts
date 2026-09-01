import { FieldError } from "../middleware/errorEnvelope";

export interface CreateTicketInput {
  summary: string;
  description: string;
  categoryId: number;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  relatedSystemId?: number;
}

export type ValidationResult =
  | { ok: true; value: CreateTicketInput }
  | { ok: false; errors: FieldError[] };

const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export function validateCreateTicketRequest(body: unknown): ValidationResult {
  const errors: FieldError[] = [];
  const b = (body ?? {}) as Record<string, unknown>;

  const summary = typeof b.summary === "string" ? b.summary.trim() : "";
  if (summary.length < 5 || summary.length > 150) {
    errors.push({ field: "summary", message: "Summary must be 5-150 characters." });
  }

  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (description.length < 10 || description.length > 5000) {
    errors.push({ field: "description", message: "Description must be 10-5000 characters." });
  }

  const categoryId = typeof b.categoryId === "number" ? b.categoryId : NaN;
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    errors.push({ field: "categoryId", message: "Category is required." });
  }

  const requestedPriority = typeof b.requestedPriority === "string" ? b.requestedPriority : "";
  if (!VALID_PRIORITIES.includes(requestedPriority)) {
    errors.push({ field: "requestedPriority", message: "Requested Priority must be Low, Medium, or High." });
  }

  let relatedSystemId: number | undefined;
  if (b.relatedSystemId !== undefined && b.relatedSystemId !== null) {
    relatedSystemId = typeof b.relatedSystemId === "number" ? b.relatedSystemId : NaN;
    if (!Number.isInteger(relatedSystemId) || relatedSystemId <= 0) {
      errors.push({ field: "relatedSystemId", message: "Related System, if provided, must be valid." });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      summary,
      description,
      categoryId,
      requestedPriority: requestedPriority as CreateTicketInput["requestedPriority"],
      ...(relatedSystemId !== undefined ? { relatedSystemId } : {}),
    },
  };
}
