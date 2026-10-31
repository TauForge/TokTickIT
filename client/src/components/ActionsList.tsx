import { useState } from "react";
import type { ActionDto } from "../api/actionsApi";
import { formatBangkok } from "../utils/bangkokTime";

const TRUNCATE_AT = 120;

function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= TRUNCATE_AT) return <>{text}</>;
  return (
    <>
      {expanded ? text : `${text.slice(0, TRUNCATE_AT)}…`}{" "}
      <button type="button" className="btn btn-link p-0" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? "Show less" : "Show more"}
      </button>
    </>
  );
}

export function FollowUpBadge({ required }: { required: boolean }) {
  if (!required) return <span className="text-muted">None</span>;
  return <span className="badge zg-badge zg-status-badge-waiting-for-requester">Follow-up needed</span>;
}

// Table on desktop; zen-green.css collapses .zg-table rows into cards below 768px.
export function ActionsList({ actions, onSelect }: { actions: ActionDto[]; onSelect?: (action: ActionDto) => void }) {
  if (actions.length === 0) return <p className="zg-empty-state">No actions recorded yet.</p>;
  return (
    <table className="zg-table">
      <thead>
        <tr>
          <th scope="col">Date/Time</th>
          <th scope="col">Performed by</th>
          <th scope="col">Result</th>
          <th scope="col">Follow-up</th>
          <th scope="col">Description</th>
          <th scope="col">Attachment notes</th>
          {onSelect && <th scope="col">Details</th>}
        </tr>
      </thead>
      <tbody>
        {actions.map((a) => (
          <tr key={a.id}>
            <td>{formatBangkok(a.actionAt)}</td>
            <td>{a.performedBy.displayName}</td>
            <td>{a.result}</td>
            <td>
              <FollowUpBadge required={a.followUpRequired} />
              {a.followUpRequired && a.followUpNote && <p className="mb-0">{a.followUpNote}</p>}
            </td>
            <td>
              <Description text={a.description} />
            </td>
            <td>{a.attachmentNotes ?? ""}</td>
            {onSelect && (
              <td>
                <button type="button" aria-label={`View action by ${a.performedBy.displayName} at ${formatBangkok(a.actionAt)}`} onClick={() => onSelect(a)}>
                  View
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
