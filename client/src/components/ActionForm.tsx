import { useRef, useState, type FormEvent } from "react";
import type { ActionDto, ActionInput } from "../api/actionsApi";
import { ApiRequestError } from "../api/apiClient";
import { formatBangkok, fromBangkokInputValue, toBangkokInputValue } from "../utils/bangkokTime";

export const ACTION_LIMITS = { description: 2000, result: 1000, followUpNote: 1000, attachmentNotes: 500 };
type FieldName = "actionAt" | "description" | "result" | "followUpNote" | "attachmentNotes";
type Errors = Partial<Record<FieldName, string>>;
const FIELD_LABEL: Record<FieldName, string> = {
  actionAt: "Action Date/Time",
  description: "Description",
  result: "Result",
  followUpNote: "Follow-up note",
  attachmentNotes: "Attachment notes",
};
const FIELD_ORDER: FieldName[] = ["actionAt", "description", "result", "followUpNote", "attachmentNotes"];

interface FormValues {
  actionAt: string;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

function initialValues(action?: ActionDto): FormValues {
  return {
    actionAt: toBangkokInputValue(action ? new Date(action.actionAt) : new Date()),
    description: action?.description ?? "",
    result: action?.result ?? "",
    followUpRequired: action?.followUpRequired ?? false,
    followUpNote: action?.followUpNote ?? "",
    attachmentNotes: action?.attachmentNotes ?? "",
  };
}

function validate(v: FormValues): Errors {
  const errors: Errors = {};
  if (!v.actionAt) errors.actionAt = "Action date/time is required.";
  if (!v.description.trim()) errors.description = "Description is required.";
  else if (v.description.trim().length > ACTION_LIMITS.description) errors.description = `Must be ${ACTION_LIMITS.description} characters or fewer.`;
  if (!v.result.trim()) errors.result = "Result is required.";
  else if (v.result.trim().length > ACTION_LIMITS.result) errors.result = `Must be ${ACTION_LIMITS.result} characters or fewer.`;
  if (v.followUpRequired && !v.followUpNote.trim()) errors.followUpNote = "Follow-up note is required when follow-up is required.";
  if (v.followUpNote.trim().length > ACTION_LIMITS.followUpNote) errors.followUpNote = `Must be ${ACTION_LIMITS.followUpNote} characters or fewer.`;
  if (v.attachmentNotes.trim().length > ACTION_LIMITS.attachmentNotes) errors.attachmentNotes = `Must be ${ACTION_LIMITS.attachmentNotes} characters or fewer.`;
  return errors;
}

function toInput(v: FormValues): ActionInput {
  return {
    actionAt: fromBangkokInputValue(v.actionAt),
    description: v.description.trim(),
    result: v.result.trim(),
    followUpRequired: v.followUpRequired,
    followUpNote: v.followUpRequired ? v.followUpNote.trim() : null,
    attachmentNotes: v.attachmentNotes.trim() || null,
  };
}

interface Props {
  action?: ActionDto;
  onSubmit: (input: ActionInput) => Promise<void>;
  onCancel: () => void;
  onReload?: () => void;
}

export function ActionForm({ action, onSubmit, onCancel, onReload }: Props) {
  const [values, setValues] = useState<FormValues>(() => initialValues(action));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(action);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function focusField(name: FieldName) {
    formRef.current?.querySelector<HTMLElement>(`#${fieldId(name)}`)?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const found = validate(values);
    setErrors(found);
    setFormError(null);
    setStale(false);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => focusField(FIELD_ORDER.find((f) => found[f])!));
      return;
    }
    setSaving(true);
    try {
      await onSubmit(toInput(values));
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "STALE_UPDATE") {
        setStale(true);
      } else if (err instanceof ApiRequestError && err.fieldErrors.length > 0) {
        const server: Errors = {};
        for (const fe of err.fieldErrors) if (fe.field in FIELD_LABEL) server[fe.field as FieldName] = fe.message;
        setErrors(server);
        if (Object.keys(server).length === 0) setFormError(err.message);
      } else if (err instanceof ApiRequestError && err.status === 409) {
        setFormError(err.message);
      } else {
        setFormError("Unable to save this action right now. Your entries are kept; please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const errorFields = FIELD_ORDER.filter((f) => errors[f]);
  const describedBy = (name: FieldName, id: string) => (errors[name] ? `${id}-error` : undefined);

  return (
    <form ref={formRef} className="zg-card" onSubmit={handleSubmit} noValidate aria-label={isEdit ? "Edit action" : "Add action"}>
      {errorFields.length > 0 && (
        <div role="alert" className="zg-error-callout">
          <p className="mb-1">Please fix the following:</p>
          <ul className="mb-0">
            {errorFields.map((f) => (
              <li key={f}>
                <a
                  href={`#${fieldId(f)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    focusField(f);
                  }}
                >
                  {errors[f]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {formError && (
        <p role="alert" className="zg-error-callout">
          {formError}
        </p>
      )}
      {stale && (
        <div role="alert" className="zg-error-callout">
          <p className="mb-1">Someone changed this. Reload to see the latest.</p>
          <button type="button" onClick={() => onReload?.()}>
            Reload
          </button>
        </div>
      )}

      <label htmlFor="action-at">Action Date/Time</label>
      <input id="action-at" type="datetime-local" value={values.actionAt} aria-describedby={describedBy("actionAt", "action-at")} onChange={(e) => set("actionAt", e.target.value)} />
      {errors.actionAt && <p id="action-at-error" className="zg-field-error">{errors.actionAt}</p>}

      <p className="form-label mt-3 mb-1">Performed by</p>
      <p className="zg-readonly">{action ? action.performedBy.displayName : "You"}</p>

      <label htmlFor="action-description">Description</label>
      <textarea id="action-description" value={values.description} aria-required="true" aria-describedby={describedBy("description", "action-description")} onChange={(e) => set("description", e.target.value)} />
      {errors.description && <p id="action-description-error" className="zg-field-error">{errors.description}</p>}

      <label htmlFor="action-result">Result</label>
      <textarea id="action-result" value={values.result} aria-required="true" aria-describedby={describedBy("result", "action-result")} onChange={(e) => set("result", e.target.value)} />
      {errors.result && <p id="action-result-error" className="zg-field-error">{errors.result}</p>}

      <div className="form-check mt-3">
        <input id="action-follow-up-required" type="checkbox" className="form-check-input" checked={values.followUpRequired} onChange={(e) => set("followUpRequired", e.target.checked)} />
        <label htmlFor="action-follow-up-required" className="form-check-label">
          Follow-up required
        </label>
      </div>

      {values.followUpRequired && (
        <>
          <label htmlFor="action-follow-up-note">Follow-up note</label>
          <textarea id="action-follow-up-note" value={values.followUpNote} aria-required="true" aria-describedby={describedBy("followUpNote", "action-follow-up-note")} onChange={(e) => set("followUpNote", e.target.value)} />
          {errors.followUpNote && <p id="action-follow-up-note-error" className="zg-field-error">{errors.followUpNote}</p>}
        </>
      )}

      <label htmlFor="action-attachment-notes">Attachment notes</label>
      <textarea id="action-attachment-notes" value={values.attachmentNotes} aria-describedby={describedBy("attachmentNotes", "action-attachment-notes")} onChange={(e) => set("attachmentNotes", e.target.value)} />
      {errors.attachmentNotes && <p id="action-attachment-notes-error" className="zg-field-error">{errors.attachmentNotes}</p>}

      <div className="mt-3 d-flex gap-2">
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Save action"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
      {isEdit && action && <p className="text-muted mt-2 mb-0">Recorded {formatBangkok(action.createdAt)}</p>}
    </form>
  );
}

function fieldId(name: FieldName): string {
  return `action-${name === "followUpNote" ? "follow-up-note" : name === "actionAt" ? "at" : name === "attachmentNotes" ? "attachment-notes" : name}`;
}
