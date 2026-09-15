import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { apiGet, apiPost, apiPatch } from "../api/apiClient";
import { PriorityBadge, StatusBadge } from "../components/badges";

interface TicketDto {
  id: string;
  ticketNumber: string;
  summary: string;
  description: string;
  categoryName: string;
  relatedSystemName: string | null;
  requestedPriority: string;
  itPriority: string;
  status: string;
  resolvedIndicatedByRequester?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AttachmentDto {
  id: string;
  filename: string;
  isRemoved: boolean;
  removedReason: string | null;
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

const ROLE_TAG: Record<string, string> = { REQUESTER: "Requester", IT_STAFF: "IT Staff", ADMINISTRATOR: "Administrator" };
const NOT_RESOLVABLE = ["RESOLVED", "CLOSED", "CANCELLED"];

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function TicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<TicketDto | null>(null);
  const [attachments, setAttachments] = useState<AttachmentDto[]>([]);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [resolvedJustNow, setResolvedJustNow] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadTicket() {
    apiGet<TicketDto>(`/api/v1/tickets/${ticketId}`)
      .then(setTicket)
      .catch(() => setError("Unable to load this ticket right now. Please try again."));
  }

  function loadAttachments() {
    return apiGet<AttachmentDto[]>(`/api/v1/tickets/${ticketId}/attachments`)
      .then(setAttachments)
      .catch(() => setError("Unable to load attachments right now. Please try again."));
  }

  function loadComments() {
    return apiGet<CommentDto[]>(`/api/v1/tickets/${ticketId}/comments`)
      .then(setComments)
      .catch(() => setError("Unable to load comments right now. Please try again."));
  }

  useEffect(() => {
    loadTicket();
    loadAttachments();
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setPendingFile(event.target.files?.[0] ?? null);
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      const response = await fetch(`${apiBaseUrl}/api/v1/tickets/${ticketId}/attachments`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Upload failed. Please try again.");
      }
      setPendingFile(null);
      await loadAttachments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function confirmRemove() {
    if (!removingId || !reason.trim()) return;
    setRemoveError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/attachments/${removingId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) {
        throw new Error("Unable to remove this attachment right now.");
      }
      const updated = (await response.json()) as AttachmentDto;
      setAttachments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setRemovingId(null);
      setReason("");
    } catch {
      setRemoveError("Unable to remove this attachment right now. Please try again.");
    }
  }

  async function handlePostComment(event: FormEvent) {
    event.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      await apiPost(`/api/v1/tickets/${ticketId}/comments`, { body: newComment.trim() });
      setNewComment("");
      await loadComments();
    } catch {
      setError("Unable to post your comment right now. Please try again.");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleMarkResolved() {
    try {
      const updated = await apiPatch<TicketDto>(`/api/v1/tickets/${ticketId}/resolved-indication`, {});
      setTicket(updated);
      setResolvedJustNow(true);
    } catch {
      setError("Unable to mark this ticket as resolved right now. Please try again.");
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

  const showResolvedButton = !resolvedJustNow && !NOT_RESOLVABLE.includes(ticket.status);

  return (
    <main className="container py-5">
      <section className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h1 className="h4 mb-3">{ticket.ticketNumber}</h1>

          <div className="row mb-3">
            <div className="col-sm-6 col-md-3">
              <span className="form-label d-block">Category</span>
              <p className="form-control-plaintext">{ticket.categoryName}</p>
            </div>
            <div className="col-sm-6 col-md-3">
              <span className="form-label d-block">Related System</span>
              <p className="form-control-plaintext">{ticket.relatedSystemName ?? "—"}</p>
            </div>
            <div className="col-sm-6 col-md-3">
              <span className="form-label d-block">Requested Priority</span>
              <PriorityBadge value={ticket.requestedPriority} kind="requested" />
            </div>
            <div className="col-sm-6 col-md-3">
              <span className="form-label d-block">IT Priority</span>
              <PriorityBadge value={ticket.itPriority} kind="it" />
            </div>
          </div>

          <div className="mb-3">
            <span className="form-label d-block">Current Status</span>
            <StatusBadge value={ticket.status} />
          </div>

          <div className="mb-3">
            <span className="form-label d-block">Summary</span>
            <p className="form-control-plaintext">{ticket.summary}</p>
          </div>
          <div className="mb-3">
            <span className="form-label d-block">Description</span>
            <p className="form-control-plaintext" style={{ whiteSpace: "pre-wrap" }}>
              {ticket.description}
            </p>
          </div>

          {showResolvedButton && (
            <button type="button" className="btn btn-outline-secondary" onClick={handleMarkResolved}>
              Problem Appears Resolved
            </button>
          )}
          {resolvedJustNow && <p className="zg-success-callout mt-2">Marked as resolved by you</p>}
        </div>
      </section>

      <section className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h2 className="h5 mb-3">Attachments</h2>

          <ul className="list-group mb-3">
            {attachments.map((a) => (
              <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
                <span>
                  {a.filename}
                  {a.isRemoved && <span className="text-muted"> — Removed: {a.removedReason}</span>}
                </span>
                {!a.isRemoved && (
                  <span>
                    <a className="btn btn-outline-secondary btn-sm me-2" href={`${apiBaseUrl}${a.downloadUrl}`}>
                      Download
                    </a>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => {
                        setRemovingId(a.id);
                        setReason("");
                        setRemoveError(null);
                      }}
                    >
                      Remove
                    </button>
                  </span>
                )}
              </li>
            ))}
            {attachments.length === 0 && <li className="list-group-item text-muted">No attachments yet.</li>}
          </ul>

          <div className="mb-3">
            <label htmlFor="ticket-detail-add-attachment" className="form-label">
              Add Attachment
            </label>
            <input id="ticket-detail-add-attachment" type="file" className="form-control" onChange={handleFileChange} />
            <button type="button" className="btn btn-primary mt-2" disabled={!pendingFile || uploading} onClick={handleUpload}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
            {uploadError && (
              <p role="alert" className="text-danger mt-2">
                {uploadError}
              </p>
            )}
          </div>

          {removingId && (
            <div className="border rounded p-3">
              <label htmlFor="ticket-detail-remove-reason" className="form-label">
                Reason
              </label>
              <input id="ticket-detail-remove-reason" className="form-control mb-2" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button type="button" className="btn btn-danger btn-sm me-2" disabled={!reason.trim()} onClick={confirmRemove}>
                Confirm
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setRemovingId(null);
                  setReason("");
                }}
              >
                Cancel
              </button>
              {removeError && (
                <p role="alert" className="text-danger mt-2">
                  {removeError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="card border-0 shadow-sm zg-comments-panel">
        <div className="card-body p-4">
          <h2 className="h5 mb-3">Public Comments</h2>

          <ul className="list-unstyled mb-3">
            {comments.map((c) => (
              <li key={c.id} className="mb-3 pb-2 border-bottom">
                <div>
                  <strong>{c.author.displayName}</strong>{" "}
                  <span className={`badge zg-badge zg-role-badge-${c.authorRole.toLowerCase().replace("_", "-")}`}>
                    {ROLE_TAG[c.authorRole] ?? c.authorRole}
                  </span>{" "}
                  <span className="text-muted">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="mb-0">{c.body}</p>
              </li>
            ))}
            {comments.length === 0 && <li className="text-muted">No comments yet.</li>}
          </ul>

          <form onSubmit={handlePostComment}>
            <label htmlFor="ticket-detail-new-comment" className="form-label">
              Post a Comment
            </label>
            <textarea
              id="ticket-detail-new-comment"
              className="form-control mb-2"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={!newComment.trim() || postingComment}>
              {postingComment ? "Posting…" : "Post Comment"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
