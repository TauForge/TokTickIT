import { useCallback, useEffect, useRef, useState } from "react";
import { createAction, listStaffActions, newIdempotencyKey, updateAction, type ActionDto, type ActionInput } from "../api/actionsApi";
import { ActionForm } from "./ActionForm";
import { ActionsList, FollowUpBadge } from "./ActionsList";
import { formatBangkok } from "../utils/bangkokTime";

const EDIT_DENIED = "Only the person who recorded this action or an Administrator can edit it.";
type Mode = { kind: "list" } | { kind: "create" } | { kind: "view"; id: string } | { kind: "edit"; id: string };

interface Props {
  ticketId: string;
  currentUser: { id: number; role: string };
  onCountChange?: (count: number) => void;
}

export function ActionsTakenPanel({ ticketId, currentUser, onCountChange }: Props) {
  const [actions, setActions] = useState<ActionDto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [announcement, setAnnouncement] = useState("");
  const idempotencyKey = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await listStaffActions(ticketId);
      setActions(next);
      setLoadError(null);
      onCountChange?.(next.length);
    } catch {
      setLoadError("Unable to load actions right now. Please try again.");
    } finally {
      setLoaded(true);
    }
  }, [ticketId, onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    idempotencyKey.current = newIdempotencyKey();
    setAnnouncement("");
    setMode({ kind: "create" });
  }

  async function handleCreate(input: ActionInput) {
    const key = idempotencyKey.current ?? newIdempotencyKey();
    idempotencyKey.current = key;
    await createAction(ticketId, input, key);
    idempotencyKey.current = null;
    setMode({ kind: "list" });
    setAnnouncement("Action saved.");
    await load();
  }

  async function handleUpdate(action: ActionDto, input: ActionInput) {
    const updated = await updateAction(ticketId, action.id, input, action.version);
    setMode({ kind: "view", id: updated.id });
    setAnnouncement("Action updated.");
    await load();
  }

  const selected = mode.kind === "view" || mode.kind === "edit" ? actions.find((a) => a.id === mode.id) : undefined;
  const canEdit = (a: ActionDto) => a.performedBy.id === currentUser.id || currentUser.role === "ADMINISTRATOR";

  return (
    <div className="zg-comments-panel" data-testid="actions-taken-panel">
      <h2 className="h6">Actions Taken</h2>
      <div role="status" aria-live="polite" className="visually-hidden">
        {announcement}
      </div>
      {loadError && (
        <p role="alert" className="zg-error-callout">
          {loadError}
        </p>
      )}
      {loaded && mode.kind === "list" && (
        <button type="button" className="mb-3" onClick={openCreate}>
          Add Action
        </button>
      )}
      {mode.kind === "create" && <ActionForm onSubmit={handleCreate} onCancel={() => setMode({ kind: "list" })} />}
      {mode.kind === "edit" && selected && (
        <ActionForm key={selected.id} action={selected} onSubmit={(input) => handleUpdate(selected, input)} onCancel={() => setMode({ kind: "view", id: selected.id })} onReload={load} />
      )}
      {mode.kind === "view" && selected && (
        <section className="zg-card" aria-label="Action details">
          <dl className="row mb-2">
            <dt className="col-sm-3">Date/Time</dt>
            <dd className="col-sm-9">{formatBangkok(selected.actionAt)}</dd>
            <dt className="col-sm-3">Performed by</dt>
            <dd className="col-sm-9">{selected.performedBy.displayName}</dd>
            <dt className="col-sm-3">Description</dt>
            <dd className="col-sm-9">{selected.description}</dd>
            <dt className="col-sm-3">Result</dt>
            <dd className="col-sm-9">{selected.result}</dd>
            <dt className="col-sm-3">Follow-up</dt>
            <dd className="col-sm-9">
              <FollowUpBadge required={selected.followUpRequired} />
              {selected.followUpNote && <p className="mb-0">{selected.followUpNote}</p>}
            </dd>
            <dt className="col-sm-3">Attachment notes</dt>
            <dd className="col-sm-9">{selected.attachmentNotes ?? "None"}</dd>
          </dl>
          <div className="d-flex gap-2">
            <button
              type="button"
              disabled={!canEdit(selected)}
              title={canEdit(selected) ? undefined : EDIT_DENIED}
              aria-describedby={canEdit(selected) ? undefined : "action-edit-denied"}
              onClick={() => setMode({ kind: "edit", id: selected.id })}
            >
              Edit
            </button>
            <button type="button" onClick={() => setMode({ kind: "list" })}>
              Close
            </button>
          </div>
          {!canEdit(selected) && (
            <p id="action-edit-denied" className="text-muted mt-2 mb-0">
              {EDIT_DENIED}
            </p>
          )}
        </section>
      )}
      {loaded && !loadError && <ActionsList actions={actions} onSelect={(a) => setMode({ kind: "view", id: a.id })} />}
    </div>
  );
}
