// Badges always render visible text, not color alone (ui-spec.md's "never rely on
// color alone" rule). zen-green.css (Task 22) adds the background-color classes
// referenced here; this task only needs the text + class to exist.

const PRIORITY_LABEL: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const STATUS_LABEL: Record<string, string> = { NEW: "New" };

export function PriorityBadge({ value, kind }: { value: string; kind: "requested" | "it" }) {
  return (
    <span
      data-testid={`priority-badge-${kind}`}
      className={`badge priority-badge priority-badge-${value.toLowerCase()}`}
    >
      {PRIORITY_LABEL[value] ?? value}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span data-testid="status-badge" className={`badge status-badge status-badge-${value.toLowerCase()}`}>
      {STATUS_LABEL[value] ?? value}
    </span>
  );
}
