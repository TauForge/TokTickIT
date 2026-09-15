import { useEffect, useState, type FormEvent } from "react";
import { apiGet, apiPatch, apiPost, ApiRequestError } from "../api/apiClient";
import { useAuth } from "../api/authContext";
import { PriorityBadge, STATUS_LABEL } from "../components/badges";

interface StaffTicketDetailDto {
  id: string;
  ticketNumber: string;
  summary: string;
  description: string;
  categoryName: string;
  relatedSystemName: string | null;
  requesterId: number;
  requesterName: string;
  requestedPriority: string;
  itPriority: string;
  status: string;
  ownerId: number | null;
  ownerDisplayName: string | null;
  resolvedIndicatedByRequester: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AssignableOwner {
  id: number;
  displayName: string;
  role: string;
}

interface AttachmentDto {
  id: string;
  filename: string;
  isRemoved: boolean;
  downloadUrl: string | null;
  sizeBytes: number;
  createdAt: string;
}

interface CommentDto {
  id: number;
  body: string;
  authorRole: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  author: { id: number; displayName: string };
  createdAt: string;
}

interface InternalNoteDto {
  id: number;
  body: string;
  author: { id: number; displayName: string };
  createdAt: string;
}

const ROLE_TAG: Record<string, string> = { REQUESTER: "Requester", IT_STAFF: "IT Staff", ADMINISTRATOR: "Administrator" };
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

// ui-spec.md §4: the client-side status list is UX guidance only — the server (Task 19's
// isValidTransition) is the actual security boundary and rejects anything not truly valid.
const STATUS_OPTIONS: Record<string, string[]> = {
  NEW: ["CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: [],
  CANCELLED: [],
};

export function StaffTicketDetail({ ticketId }: { ticketId: string }) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<StaffTicketDetailDto | null>(null);
  const [owners, setOwners] = useState<AssignableOwner[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDto[]>([]);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [notes, setNotes] = useState<InternalNoteDto[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newNote, setNewNote] = useState("");
  const [conflict, setConflict] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadTicket() {
    return apiGet<StaffTicketDetailDto>(`/api/v1/staff/tickets/${ticketId}`)
      .then(setTicket)
      .catch(() => setError("Unable to load this ticket right now. Please try again."));
  }
  function loadOwners() {
    apiGet<AssignableOwner[]>("/api/v1/staff/assignable-owners").then(setOwners).catch(() => setOwners([]));
  }
  function loadAttachments() {
    apiGet<AttachmentDto[]>(`/api/v1/staff/tickets/${ticketId}/attachments`).then(setAttachments).catch(() => setAttachments([]));
  }
  function loadComments() {
    return apiGet<CommentDto[]>(`/api/v1/staff/tickets/${ticketId}/comments`).then(setComments).catch(() => setComments([]));
  }
  function loadNotes() {
    return apiGet<InternalNoteDto[]>(`/api/v1/staff/tickets/${ticketId}/notes`).then(setNotes).catch(() => setNotes([]));
  }

  useEffect(() => {
    loadTicket();
    loadOwners();
    loadAttachments();
    loadComments();
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function applyMutation(path: string, body: unknown) {
    if (!ticket) return;
    setConflict(null);
    try {
      const updated = await apiPatch<StaffTicketDetailDto>(`/api/v1/staff/tickets/${ticketId}${path}`, body);
      setTicket(updated);
    } catch (err) {
      // BR-18/BR-19: a rejected mutation reverts to the last known-good value — this
      // function never optimistically applies the new value before the response lands,
      // so "reverting" is simply "don't touch state on failure."
      setConflict(err instanceof ApiRequestError ? err.message : "Unable to save this change right now.");
    }
  }

  async function handlePostComment(event: FormEvent) {
    event.preventDefault();
    if (!newComment.trim()) return;
    try {
      await apiPost(`/api/v1/staff/tickets/${ticketId}/comments`, { body: newComment.trim() });
      setNewComment("");
      await loadComments();
    } catch {
      setError("Unable to post your comment right now. Please try again.");
    }
  }

  async function handlePostNote(event: FormEvent) {
    event.preventDefault();
    if (!newNote.trim()) return;
    try {
      await apiPost(`/api/v1/staff/tickets/${ticketId}/notes`, { body: newNote.trim() });
      setNewNote("");
      await loadNotes();
    } catch {
      setError("Unable to post your note right now. Please try again.");
    }
  }

  if (error) {
    return (
      <main className="container py-5">
        <p role="alert" className="text-danger">
          {error}
        </p>
      </main>
    );
  }
  if (!ticket) {
    return (
      <main className="container py-5">
        <p>Loading ticket…</p>
      </main>
    );
  }

  return (
    <main className="container py-5">
      <h1 className="h4 mb-3">{ticket.ticketNumber}</h1>

      {conflict && (
        <p role="alert" className="zg-error-callout text-danger">
          {conflict}
        </p>
      )}

      <section className="zg-card">
        <dl className="row">
          <dt className="col-sm-3">Requester</dt>
          <dd className="col-sm-9 zg-readonly">{ticket.requesterName}</dd>
          <dt className="col-sm-3">Category</dt>
          <dd className="col-sm-9 zg-readonly">{ticket.categoryName}</dd>
          <dt className="col-sm-3">Summary</dt>
          <dd className="col-sm-9 zg-readonly">{ticket.summary}</dd>
          <dt className="col-sm-3">Description</dt>
          <dd className="col-sm-9 zg-readonly">{ticket.description}</dd>
          <dt className="col-sm-3">Requested Priority</dt>
          <dd className="col-sm-9">
            <PriorityBadge value={ticket.requestedPriority} kind="requested" />
          </dd>
        </dl>

        {ticket.resolvedIndicatedByRequester && (
          <p data-testid="resolution-indication-badge" className="zg-success-callout">
            Requester indicated this is resolved on {new Date(ticket.updatedAt).toLocaleDateString()}.
          </p>
        )}

        <div className="row g-3">
          <div className="col-sm-4">
            <label htmlFor="staff-ticket-owner" className="form-label">
              Ticket Owner
            </label>
            <select
              id="staff-ticket-owner"
              className="form-select"
              value={ticket.ownerId ?? ""}
              onChange={(e) => applyMutation("/owner", { ownerId: Number(e.target.value) })}
            >
              <option value="" disabled>
                Unassigned
              </option>
              {ticket.ownerId !== user!.id && <option value={user!.id}>Claim for myself</option>}
              {owners
                .filter((o) => o.id !== user!.id)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.displayName}
                  </option>
                ))}
            </select>
          </div>
          <div className="col-sm-4">
            <label htmlFor="staff-ticket-priority" className="form-label">
              IT Priority
            </label>
            <select
              id="staff-ticket-priority"
              className="form-select"
              value={ticket.itPriority}
              onChange={(e) => applyMutation("/priority", { itPriority: e.target.value })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="col-sm-4">
            <label htmlFor="staff-ticket-status" className="form-label">
              Current Status
            </label>
            <select
              id="staff-ticket-status"
              className="form-select"
              value={ticket.status}
              onChange={(e) => applyMutation("/status", { status: e.target.value })}
            >
              <option value={ticket.status}>{STATUS_LABEL[ticket.status] ?? ticket.status}</option>
              {(STATUS_OPTIONS[ticket.status] ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section data-testid="public-comments-panel" className="zg-comments-panel">
        <h2 className="h6">Public Comments</h2>
        {comments.length === 0 && <p>No comments yet.</p>}
        <ul className="list-unstyled">
          {comments.map((c) => (
            <li key={c.id} className="mb-2">
              <strong>{c.author.displayName}</strong> <span className="badge zg-badge">{ROLE_TAG[c.authorRole]}</span>
              <span className="text-muted ms-2">{new Date(c.createdAt).toLocaleString()}</span>
              <p className="mb-0">{c.body}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={handlePostComment}>
          <label htmlFor="staff-post-comment" className="form-label">
            Post a comment
          </label>
          <textarea id="staff-post-comment" className="form-control" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
          <button type="submit" className="btn btn-primary mt-2">
            Post Comment
          </button>
        </form>
      </section>

      <section data-testid="internal-notes-panel" className="zg-notes-panel">
        <p className="zg-notes-panel-label">Internal — not visible to Requester</p>
        <h2 className="h6">Internal Notes</h2>
        {notes.length === 0 && <p>No internal notes yet.</p>}
        <ul className="list-unstyled">
          {notes.map((n) => (
            <li key={n.id} className="mb-2">
              <strong>{n.author.displayName}</strong>
              <span className="text-muted ms-2">{new Date(n.createdAt).toLocaleString()}</span>
              <p className="mb-0">{n.body}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={handlePostNote}>
          <label htmlFor="staff-post-note" className="form-label">
            Add an internal note
          </label>
          <textarea id="staff-post-note" className="form-control" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          <button type="submit" className="btn btn-primary mt-2">
            Post Note
          </button>
        </form>
      </section>

      <section data-testid="staff-attachments-panel" className="zg-card">
        <h2 className="h6">Attachments</h2>
        {attachments.length === 0 && <p>No attachments.</p>}
        <ul className="list-unstyled">
          {attachments.map((a) => (
            <li key={a.id}>
              {a.isRemoved ? <span className="text-muted">{a.filename} (removed)</span> : <a href={a.downloadUrl ?? "#"}>{a.filename}</a>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
