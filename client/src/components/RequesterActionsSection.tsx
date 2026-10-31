import { useEffect, useState } from "react";
import { listRequesterActions, type ActionDto } from "../api/actionsApi";
import { ActionsList } from "./ActionsList";

// Read-only: Requesters never get Add or Edit (BR-10).
export function RequesterActionsSection({ ticketId }: { ticketId: string }) {
  const [actions, setActions] = useState<ActionDto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    listRequesterActions(ticketId)
      .then(setActions)
      .catch(() => setError(true));
  }, [ticketId]);

  return (
    <section className="card border-0 shadow-sm mb-4 zg-comments-panel" data-testid="requester-actions-panel">
      <div className="card-body p-4">
        <h2 className="h5 mb-3">Actions Taken</h2>
        {error && (
          <p role="alert" className="zg-error-callout">
            Unable to load actions right now. Please try again.
          </p>
        )}
        {actions && <ActionsList actions={actions} />}
      </div>
    </section>
  );
}
