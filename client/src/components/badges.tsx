// Badges always render visible text, not color alone (ui-spec.md's "never rely on
// color alone" rule). zen-green.css (Task 22) adds the background-color classes
// referenced here; this task only needs the text + class to exist.

const PRIORITY_LABEL: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

// Exported (not just a local const) so Task 24's StaffTicketDetail can render the
// current-status <option>'s label as plain text, since an <option> may only contain
// text — nesting <StatusBadge> (which renders a <span>) inside one is invalid HTML.
export const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

const ROLE_LABEL: Record<string, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMINISTRATOR: "Administrator",
};

export function PriorityBadge({ value, kind }: { value: string; kind: "requested" | "it" }) {
  return (
    <span
      data-testid={`priority-badge-${kind}`}
      className={`badge priority-badge priority-badge-${value.toLowerCase()} zg-badge zg-priority-badge-${value.toLowerCase()}`}
    >
      {PRIORITY_LABEL[value] ?? value}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      data-testid="status-badge"
      className={`badge status-badge status-badge-${value.toLowerCase()} zg-badge zg-status-badge-${value.toLowerCase().replace(/_/g, "-")}`}
    >
      {STATUS_LABEL[value] ?? value}
    </span>
  );
}

export function RoleBadge({ value }: { value: string }) {
  return (
    <span
      data-testid="role-badge"
      className={`badge zg-badge zg-role-badge-${value.toLowerCase().replace(/_/g, "-")}`}
    >
      {ROLE_LABEL[value] ?? value}
    </span>
  );
}
