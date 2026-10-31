import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError } from "../api/apiClient";
import { formatBangkok } from "../utils/bangkokTime";

export const DASHBOARD_ERROR = "Unable to load the dashboard right now. Please try again.";
export const FORBIDDEN_TEXT = "You don't have access to this page.";

export type DashboardState<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T }
  | { kind: "forbidden" }
  | { kind: "error" };

// Loads a dashboard once, exposes reload (Refresh/Retry) and a flag for in-flight requests.
// `enabled` false skips the request so a wrong-role user never calls the endpoint.
export function useDashboard<T>(load: () => Promise<T>, enabled: boolean) {
  const [state, setState] = useState<DashboardState<T>>({ kind: "loading" });
  const [loading, setLoading] = useState(enabled);
  const [announcement, setAnnouncement] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    return load()
      .then((data) => {
        setState({ kind: "ready", data });
        setAnnouncement("Dashboard updated");
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.status === 403) {
          setState({ kind: "forbidden" });
        } else {
          setState({ kind: "error" });
          setAnnouncement(DASHBOARD_ERROR);
        }
      })
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { state, loading, reload, announcement };
}

export function MetricCard(props: {
  id: string;
  label: string;
  value: number;
  to: string;
  linkName: string;
  linkText?: string;
  note?: string;
}) {
  return (
    <div className="zg-metric-card" data-testid={`metric-card-${props.id}`}>
      <p className="zg-metric-label">{props.label}</p>
      <p className="zg-metric-value">{props.value}</p>
      {props.note && <p className="zg-metric-note">{props.note}</p>}
      <Link to={props.to} aria-label={props.linkName}>
        {props.linkText ?? "View"}
      </Link>
    </div>
  );
}

export function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="zg-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="h6">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function QuickActions({ actions }: { actions: { label: string; to: string }[] }) {
  return (
    <DashboardSection title="Quick Actions">
      <div className="zg-quick-actions">
        {actions.map((a) => (
          <Link key={a.label} to={a.to} className="zg-primary-button zg-quick-action">
            {a.label}
          </Link>
        ))}
      </div>
    </DashboardSection>
  );
}

export function TicketRowList(props: {
  rows: { id: string; to: string; ticketNumber: string; primary: string; badges?: ReactNode; updatedAt: string }[];
  emptyText: string;
}) {
  if (props.rows.length === 0) return <p className="zg-empty-state">{props.emptyText}</p>;
  return (
    <ul className="zg-ticket-list">
      {props.rows.map((r) => (
        <li key={r.id}>
          <Link to={r.to}>{r.ticketNumber}</Link>
          <span className="zg-ticket-list-summary">{r.primary}</span>
          {r.badges}
          <time dateTime={r.updatedAt} className="zg-ticket-list-date">
            {formatBangkok(r.updatedAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}

export function DashboardSkeleton() {
  return (
    <div data-testid="dashboard-skeleton" className="zg-metric-grid" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="zg-metric-card zg-skeleton" />
      ))}
    </div>
  );
}

export function DashboardFrame(props: {
  title: string;
  busy: boolean;
  announcement: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="container py-4" aria-busy={props.busy}>
      <div className="zg-dashboard-header">
        <h1 className="h4 mb-0">{props.title}</h1>
        {props.actions}
      </div>
      <div role="status" aria-live="polite" className="visually-hidden">
        {props.announcement}
      </div>
      {props.children}
    </main>
  );
}

export function DashboardError({ onRetry, busy }: { onRetry: () => void; busy: boolean }) {
  return (
    <div role="alert" className="zg-error-callout">
      <p className="mb-2">{DASHBOARD_ERROR}</p>
      <button type="button" onClick={onRetry} disabled={busy}>
        Retry
      </button>
    </div>
  );
}
