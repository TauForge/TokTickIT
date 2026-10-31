import { useAuth } from "../api/authContext";
import { getRequesterDashboard, type RequesterRowDto } from "../api/dashboardApi";
import { StatusBadge } from "../components/badges";
import {
  DashboardError,
  DashboardFrame,
  DashboardSection,
  DashboardSkeleton,
  FORBIDDEN_TEXT,
  MetricCard,
  QuickActions,
  TicketRowList,
  useDashboard,
} from "../components/dashboard";

function requesterRows(rows: RequesterRowDto[]) {
  return rows.map((r) => ({
    id: r.id,
    to: `/tickets/${r.id}`,
    ticketNumber: r.ticketNumber,
    primary: r.summary,
    updatedAt: r.updatedAt,
    badges: <StatusBadge value={r.status} />,
  }));
}

export function RequesterDashboard() {
  const { user, loading: authLoading } = useAuth();
  const allowed = user?.role === "REQUESTER";
  const { state, loading, reload, announcement } = useDashboard(getRequesterDashboard, allowed);
  const busy = authLoading || loading;

  if ((!authLoading && !allowed) || state.kind === "forbidden") {
    return (
      <main className="container py-4">
        <p role="alert">{FORBIDDEN_TEXT}</p>
      </main>
    );
  }

  const title = user && state.kind === "ready" ? `Welcome, ${user.displayName}` : "Dashboard";
  const card = (id: string, label: string, value: number, filter: string | null, note?: string) => (
    <MetricCard
      id={id}
      label={label}
      value={value}
      to={filter ? `/tickets?status=${filter}` : "/tickets"}
      linkName={`View all ${label} tickets`}
      linkText="View all"
      note={note}
    />
  );

  return (
    <DashboardFrame title={title} busy={busy} announcement={announcement}>
      {state.kind === "error" && <DashboardError onRetry={() => void reload()} busy={busy} />}
      {state.kind === "loading" && <DashboardSkeleton />}
      {state.kind === "ready" && (
        <>
          <div className="zg-metric-grid">
            {card("my-open", "My Open", state.data.counts.myOpen, null)}
            {card("in-progress", "In Progress", state.data.counts.inProgress, "IN_PROGRESS")}
            {card("waiting-for-me", "Waiting for Me", state.data.counts.waitingForMe, "WAITING_FOR_REQUESTER", state.data.counts.waitingForMe > 0 ? "Needs your reply" : undefined)}
            {card("resolved", "Resolved", state.data.counts.resolved, "RESOLVED")}
            {card("closed", "Closed", state.data.counts.closed, "CLOSED")}
          </div>
          <div className="zg-dashboard-lists">
            <DashboardSection title="Recently Updated">
              <TicketRowList rows={requesterRows(state.data.recentlyUpdated)} emptyText="No tickets yet." />
            </DashboardSection>
            <DashboardSection title="Recently Resolved">
              <TicketRowList rows={requesterRows(state.data.recentlyResolved)} emptyText="No resolved tickets yet." />
            </DashboardSection>
          </div>
          <QuickActions
            actions={[
              { label: "Create Ticket", to: "/tickets/new" },
              { label: "View My Tickets", to: "/tickets" },
            ]}
          />
        </>
      )}
    </DashboardFrame>
  );
}
