import { FieldError } from "../middleware/errorEnvelope";

export interface ActionFields {
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  actionAt: Date;
}
export interface ActionContext {
  ticketCreatedAt: Date;
  now: Date;
}
export type ActionValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldError[]; versionMissing?: boolean };

const LIMITS = { description: 2000, result: 1000, followUpNote: 1000, attachmentNotes: 500 };
const FUTURE_TOLERANCE_MS = 5 * 60_000;

function requiredText(raw: unknown, field: "description" | "result", errors: FieldError[]): string {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) errors.push({ field, message: `${field === "result" ? "Result" : "Description"} is required.` });
  else if (text.length > LIMITS[field]) errors.push({ field, message: `Must be ${LIMITS[field]} characters or fewer.` });
  return text;
}

function optionalText(raw: unknown, field: "followUpNote" | "attachmentNotes", errors: FieldError[]): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    errors.push({ field, message: "Must be text." });
    return null;
  }
  const text = raw.trim();
  if (text.length > LIMITS[field]) errors.push({ field, message: `Must be ${LIMITS[field]} characters or fewer.` });
  return text || null;
}

// BR-04..06: shared by create (defaults applied) and PATCH (existing values merged in first).
function validateMerged(raw: Record<string, unknown>, ctx: ActionContext): ActionValidationResult<ActionFields> {
  const errors: FieldError[] = [];
  const description = requiredText(raw.description, "description", errors);
  const result = requiredText(raw.result, "result", errors);

  let followUpRequired = false;
  if (raw.followUpRequired !== undefined && raw.followUpRequired !== null) {
    if (typeof raw.followUpRequired === "boolean") followUpRequired = raw.followUpRequired;
    else errors.push({ field: "followUpRequired", message: "Must be true or false." });
  }
  const followUpNote = optionalText(raw.followUpNote, "followUpNote", errors);
  if (followUpRequired && !followUpNote && !errors.some((e) => e.field === "followUpNote")) {
    errors.push({ field: "followUpNote", message: "A follow-up note is required when follow-up is required." });
  }
  if (!followUpRequired && followUpNote) {
    errors.push({ field: "followUpNote", message: "Follow-up note is only allowed when follow-up is required." });
  }
  const attachmentNotes = optionalText(raw.attachmentNotes, "attachmentNotes", errors);

  let actionAt = ctx.now;
  if (raw.actionAt !== undefined && raw.actionAt !== null) {
    const parsed = raw.actionAt instanceof Date ? raw.actionAt : new Date(String(raw.actionAt));
    if (typeof raw.actionAt === "number" || Number.isNaN(parsed.getTime())) {
      errors.push({ field: "actionAt", message: "Must be a valid date and time." });
    } else if (parsed.getTime() > ctx.now.getTime() + FUTURE_TOLERANCE_MS) {
      errors.push({ field: "actionAt", message: "Cannot be more than 5 minutes in the future." });
    } else if (parsed.getTime() < ctx.ticketCreatedAt.getTime()) {
      errors.push({ field: "actionAt", message: "Cannot be earlier than the ticket's creation." });
    } else {
      actionAt = parsed;
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { description, result, followUpRequired, followUpNote, attachmentNotes, actionAt } };
}

export function validateActionCreate(body: unknown, ctx: ActionContext): ActionValidationResult<ActionFields> {
  return validateMerged((body ?? {}) as Record<string, unknown>, ctx);
}

export function validateActionPatch(
  body: unknown,
  existing: ActionFields,
  ctx: ActionContext,
): ActionValidationResult<ActionFields & { expectedVersion: number }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const ev = b.expectedVersion;
  if (typeof ev !== "number" || !Number.isInteger(ev) || ev < 0) {
    return { ok: false, versionMissing: true, errors: [{ field: "expectedVersion", message: "expectedVersion is required." }] };
  }
  const merged = { ...existing, ...Object.fromEntries(Object.entries(b).filter(([k, v]) => k !== "expectedVersion" && v !== undefined)) };
  const result = validateMerged(merged, ctx);
  return result.ok ? { ok: true, value: { ...result.value, expectedVersion: ev } } : result;
}
