import { useEffect, useState, type FormEvent } from "react";
import { apiGet, apiPost } from "../api/apiClient";

interface Category {
  id: number;
  name: string;
  code: string | null;
}

interface RelatedSystem {
  id: number;
  name: string;
}

interface FieldError {
  field: string;
  message: string;
}

interface CreateTicketForm {
  summary: string;
  description: string;
  categoryId: string;
  requestedPriority: string;
}

function validate(form: CreateTicketForm): FieldError[] {
  const errors: FieldError[] = [];
  const summary = form.summary.trim();
  const description = form.description.trim();

  if (summary.length < 5 || summary.length > 150) {
    errors.push({ field: "summary", message: "Summary must be 5-150 characters." });
  }
  if (description.length < 10 || description.length > 5000) {
    errors.push({ field: "description", message: "Description must be 10-5000 characters." });
  }
  if (!form.categoryId) {
    errors.push({ field: "categoryId", message: "Category is required." });
  }
  if (!form.requestedPriority) {
    errors.push({ field: "requestedPriority", message: "Requested Priority is required." });
  }
  return errors;
}

export function CreateTicket({
  requesterId,
  requesterName,
  onCreated,
}: {
  requesterId: number;
  requesterName: string;
  onCreated: (ticket: { id: string; ticketNumber: string }) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Category[]>("/api/categories", requesterId).then(setCategories);
    apiGet<RelatedSystem[]>("/api/related-systems", requesterId).then(setRelatedSystems);
  }, [requesterId]);

  function errorFor(field: string) {
    return fieldErrors.find((e) => e.field === field)?.message;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    // Client-side validation mirrors the server's rules (BR-08, BR-09, BR-10, BR-11) so
    // AC-04/FR-11's "the API is not called" is actually true, not just a passing test that
    // happens not to notice a stray call.
    const localErrors = validate({ summary, description, categoryId, requestedPriority });
    if (localErrors.length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setFieldErrors([]);
    setSubmitting(true);
    try {
      const ticket = await apiPost<{ id: string; ticketNumber: string }>(
        "/api/tickets",
        {
          summary,
          description,
          categoryId: categoryId ? Number(categoryId) : undefined,
          relatedSystemId: relatedSystemId ? Number(relatedSystemId) : undefined,
          requestedPriority,
        },
        requesterId,
      );
      onCreated(ticket);
    } catch (error) {
      const err = error as Error & { fieldErrors?: FieldError[] };
      if (err.fieldErrors?.length) {
        setFieldErrors(err.fieldErrors);
      } else {
        setFormError(
          "Unable to submit the ticket right now. Your entries have been kept — please try again.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-5">
      <section className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <h1 className="h4 mb-3">Create Ticket</h1>
          {formError && (
            <p role="alert" className="text-danger">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <span className="form-label d-block">Requester</span>
              <p className="form-control-plaintext">{requesterName}</p>
            </div>

            <div className="mb-3">
              <label htmlFor="create-ticket-summary" className="form-label">
                Summary *
              </label>
              <input
                id="create-ticket-summary"
                className="form-control"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
              {errorFor("summary") && (
                <p role="alert" className="text-danger">
                  {errorFor("summary")}
                </p>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="create-ticket-description" className="form-label">
                Description *
              </label>
              <textarea
                id="create-ticket-description"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {errorFor("description") && (
                <p role="alert" className="text-danger">
                  {errorFor("description")}
                </p>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="create-ticket-category" className="form-label">
                Category *
              </label>
              <select
                id="create-ticket-category"
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select a category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errorFor("categoryId") && (
                <p role="alert" className="text-danger">
                  {errorFor("categoryId")}
                </p>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="create-ticket-related-system" className="form-label">
                Related System
              </label>
              <select
                id="create-ticket-related-system"
                className="form-select"
                value={relatedSystemId}
                onChange={(e) => setRelatedSystemId(e.target.value)}
              >
                <option value="">None</option>
                {relatedSystems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label htmlFor="create-ticket-priority" className="form-label">
                Requested Priority *
              </label>
              <select
                id="create-ticket-priority"
                className="form-select"
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value)}
              >
                <option value="">Select a priority…</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              {errorFor("requestedPriority") && (
                <p role="alert" className="text-danger">
                  {errorFor("requestedPriority")}
                </p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
