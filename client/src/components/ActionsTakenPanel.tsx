import { useCallback, useEffect, useRef, useState } from "react";
import { createAction, listStaffActions, newIdempotencyKey, updateAction, type ActionDto, type ActionInput } from "../api/actionsApi";
import { ActionForm, type ActionDraft } from "./ActionForm";
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
  const [formKey, setFormKey] = useState(0);
  const [discarded, setDiscarded] = useState<ActionDraft | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const modeChanged = useRef(false);

  // Focus management: the control that opened a mode unmounts with it, so without this focus
  // falls back to the page body. Forms focus their first field; list/view focus the heading.
  useEffect(() => {
    if (!modeChanged.current) {
      modeChanged.current = true;
      return;
    }
    const target = mode.kind === "create" || mode.kind === "edit" ? "#action-at" : "h2";
    panelRef.current?.querySelector<HTMLElement>(target)?.focus();
  }, [mode.kind]);

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
    // Kept until a save succeeds, so Cancel followed by Add Action after a failed or unknown send still dedupes.
    idempotencyKey.current ??= newIdempotencyKey();
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
    setDiscarded(null);
    setMode({ kind: "view", id: updated.id });
    setAnnouncement("Action updated.");
    await load();
  }

  // After a stale update the form restarts from the latest saved values, so Save can never silently replace
  // someone else's edit; what the user had typed stays visible so nothing is lost.
  async function handleReload(draft: ActionDraft) {
    setDiscarded(draft);
    await load();
    setFormKey((k) => k + 1);
    setAnnouncement("Reloaded the latest saved values.");
  }

  const selected = mode.kind === "view" || mode.kind === "edit" ? actions.find((a) => a.id === mode.id) : undefined;
  const canEdit = (a: ActionDto) => a.performedBy.id === currentUser.id || currentUser.role === "ADMINISTRATOR";

  return (
    <div ref={panelRef} className="zg-comments-panel" data-testid="actions-taken-panel">
      <h2 className="h6" tabIndex={-1}>
        Actions Taken
      </h2>
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
        <>
          {discarded && (
            <div role="status" className="zg-card mb-2">
              <p className="mb-1">Showing the latest saved values. Your unsaved text is kept here so you can copy it back in.</p>
              <ul className="mb-0">
                <li>Description: {discarded.description || "(empty)"}</li>
                <li>Result: {discarded.result || "(empty)"}</li>
                {discarded.followUpNote && <li>Follow-up note: {discarded.followUpNote}</li>}
                {discarded.attachmentNotes && <li>Attachment notes: {discarded.attachmentNotes}</li>}
              </ul>
            </div>
          )}
          <ActionForm key={`${selected.id}-${formKey}`} action={selected} onSubmit={(input) => handleUpdate(selected, input)} onCancel={() => { setDiscarded(null); setMode({ kind: "view", id: selected.id }); }} onReload={handleReload} />
        </>
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
              onClick={() => {
                setDiscarded(null);
                setMode({ kind: "edit", id: selected.id });
              }}
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
