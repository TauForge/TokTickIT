import { Link } from "react-router-dom";
import { useAuth } from "../api/authContext";
import { getStaffDashboard, type StaffDashboardDto, type StaffRowDto } from "../api/dashboardApi";
import { PriorityBadge, StatusBadge } from "../components/badges";
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

const QUEUE = "/staff/tickets";
const PRIORITIES = [
  { key: "LOW", label: "Low" },
  { key: "MEDIUM", label: "Medium" },
  { key: "HIGH", label: "High" },
] as const;

function staffRows(rows: StaffRowDto[]) {
  return rows.map((r) => ({
    id: r.id,
    to: `${QUEUE}/${r.id}`,
    ticketNumber: r.ticketNumber,
    primary: r.summary,
    updatedAt: r.updatedAt,
    badges: (
      <>
        <StatusBadge value={r.status} />
        <PriorityBadge value={r.itPriority} kind="it" />
      </>
    ),
  }));
}

function Metrics({ data, userId }: { data: StaffDashboardDto; userId: number }) {
  const c = data.counts;
  const status = (id: string, label: string, value: number, status: string) => (
    <MetricCard id={id} label={label} value={value} to={`${QUEUE}?status=${status}`} linkName={`View ${label} tickets`} />
  );
  return (
    <div className="zg-metric-grid">
      {status("new", "New", c.new, "NEW")}
      {status("open", "Open", c.open, "OPEN")}
      {status("in-progress", "In Progress", c.inProgress, "IN_PROGRESS")}
      {status("waiting-for-requester", "Waiting for Requester", c.waitingForRequester, "WAITING_FOR_REQUESTER")}
      <MetricCard id="my-assigned" label="My Assigned" value={c.myAssigned} to={`${QUEUE}?ownerId=${userId}&activeOnly=true`} linkName="View My Assigned tickets" />
      <MetricCard id="unassigned" label="Unassigned" value={c.unassigned} to={`${QUEUE}?ownerId=unassigned&activeOnly=true`} linkName="View Unassigned tickets" />
      <div className="zg-metric-card" data-testid="metric-card-by-it-priority">
        <p className="zg-metric-label">By IT Priority</p>
        <ul className="zg-metric-split">
          {PRIORITIES.map((p) => (
            <li key={p.key}>
              <PriorityBadge value={p.key} kind="it" />
              <Link to={`${QUEUE}?itPriority=${p.key}&activeOnly=true`} aria-label={`View ${p.label} priority tickets`}>
                <span className="zg-metric-value">{c.byItPriority[p.key]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {data.userCounts && (
        <div className="zg-metric-card" data-testid="metric-card-users">
          <p className="zg-metric-label">Users</p>
          <ul className="zg-metric-split">
            <li>
              Active <span className="zg-metric-value">{data.userCounts.active}</span>
            </li>
            <li>
              Inactive <span className="zg-metric-value">{data.userCounts.inactive}</span>
            </li>
          </ul>
          <p className="zg-metric-note">
            Requester {data.userCounts.requester}, IT Staff {data.userCounts.itStaff}, Administrator {data.userCounts.administrator}
          </p>
          <Link to="/admin/users" aria-label="View Users">
            View
          </Link>
        </div>
      )}
    </div>
  );
}

export function StaffDashboard() {
  const { user, loading: authLoading } = useAuth();
  const allowed = user !== null && (user.role === "IT_STAFF" || user.role === "ADMINISTRATOR");
  const { state, loading, reload, announcement } = useDashboard(getStaffDashboard, allowed);
  const busy = authLoading || loading;

  if (!authLoading && !allowed) {
    return (
      <main className="container py-4">
        <p role="alert">{FORBIDDEN_TEXT}</p>
      </main>
    );
  }
  if (state.kind === "forbidden") {
    return (
      <main className="container py-4">
        <p role="alert">{FORBIDDEN_TEXT}</p>
      </main>
    );
  }

  const title = user && state.kind === "ready" ? `Welcome back, ${user.displayName}` : "Dashboard";
  const refresh = (
    <button type="button" onClick={() => void reload()} disabled={busy}>
      Refresh
    </button>
  );

  return (
    <DashboardFrame title={title} busy={busy} announcement={announcement} actions={refresh}>
      {state.kind === "error" && <DashboardError onRetry={() => void reload()} busy={busy} />}
      {state.kind === "loading" && <DashboardSkeleton />}
      {state.kind === "ready" && user && (
        <>
          <Metrics data={state.data} userId={user.id} />
          <div className="zg-dashboard-lists">
            <DashboardSection title="Urgent">
              <TicketRowList rows={staffRows(state.data.urgent)} emptyText="No tickets need attention." />
            </DashboardSection>
            <DashboardSection title="Recently Updated">
              <TicketRowList rows={staffRows(state.data.recentlyUpdated)} emptyText="No tickets need attention." />
            </DashboardSection>
            <DashboardSection title="My Recent Actions">
              <TicketRowList
                rows={state.data.myRecentActions.map((a) => ({
                  id: a.id,
                  to: `${QUEUE}/${a.ticketId}`,
                  ticketNumber: a.ticketNumber,
                  primary: a.description,
                  updatedAt: a.actionAt,
                }))}
                emptyText="No actions recorded yet."
              />
            </DashboardSection>
          </div>
          <QuickActions
            actions={[
              { label: "Create Ticket", to: "/tickets/new" },
              { label: "Search Tickets", to: QUEUE },
              { label: "My Queue", to: `${QUEUE}?ownerId=${user.id}&activeOnly=true` },
            ]}
          />
        </>
      )}
    </DashboardFrame>
  );
}
