import "bootstrap/dist/css/bootstrap.min.css";
import "./theme/zen-green.css";

import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./api/authContext";
import { RoleBadge } from "./components/badges";
import { Login } from "./screens/Login";
import { ChangePassword } from "./screens/ChangePassword";
import { CreateTicket } from "./screens/CreateTicket";
import { MyTickets } from "./screens/MyTickets";
import { RequesterDashboard } from "./screens/RequesterDashboard";
import { StaffDashboard } from "./screens/StaffDashboard";
import { StaffTicketQueue } from "./screens/StaffTicketQueue";
import { StaffTicketDetail } from "./screens/StaffTicketDetail";
import { TicketDetail } from "./screens/TicketDetail";
import { UserManagement } from "./screens/UserManagement";

function TicketDetailRoute() {
  const { id } = useParams();
  return <TicketDetail ticketId={id ?? ""} />;
}

function StaffTicketDetailRoute() {
  const { id } = useParams();
  return <StaffTicketDetail ticketId={id ?? ""} />;
}

function CreateTicketRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Staff cannot open the Requester detail route, so they land on the staff detail screen.
  const base = user?.role === "REQUESTER" ? "/tickets" : "/staff/tickets";
  return <CreateTicket onCreated={(ticket) => navigate(`${base}/${ticket.id}`)} />;
}

// Every role lands on the Dashboard after login (ui-spec.md navigation).
const HOME = "/dashboard";

function Shell() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="container py-5">
        <p>Loading…</p>
      </main>
    );
  }

  if (!user) return <Login />;
  if (user.mustChangePassword) return <ChangePassword />;

  return (
    <div>
      <header className="zg-app-header">
        <span className="navbar-brand">TokTickIT</span>
        <nav aria-label="Main">
          <NavLink to="/dashboard" end>
            Dashboard
          </NavLink>
          {user.role === "REQUESTER" && (
            <NavLink to="/tickets" end>
              My Tickets
            </NavLink>
          )}
          {user.role !== "REQUESTER" && <NavLink to="/staff/tickets">My Queue</NavLink>}
          <NavLink to="/tickets/new" end>
            Create Ticket
          </NavLink>
          {user.role === "ADMINISTRATOR" && <NavLink to="/admin/users">Admin</NavLink>}
        </nav>
        <div className="d-flex align-items-center">
          <span className="me-3">
            {user.displayName} <RoleBadge value={user.role} />
          </span>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <Routes>
        <Route path="/dashboard" element={user.role === "REQUESTER" ? <RequesterDashboard /> : <StaffDashboard />} />
        {user.role === "REQUESTER" && (
          <>
            <Route path="/tickets" element={<MyTickets />} />
            <Route path="/tickets/new" element={<CreateTicketRoute />} />
            <Route path="/tickets/:id" element={<TicketDetailRoute />} />
          </>
        )}
        {user.role !== "REQUESTER" && (
          <>
            <Route path="/staff/tickets" element={<StaffTicketQueue />} />
            <Route path="/staff/tickets/:id" element={<StaffTicketDetailRoute />} />
            <Route path="/tickets/new" element={<CreateTicketRoute />} />
            <Route path="/tickets/:id" element={<TicketDetailRoute />} />
          </>
        )}
        {user.role === "ADMINISTRATOR" && <Route path="/admin/users" element={<UserManagement />} />}
        <Route path="/" element={<Navigate to={HOME} replace />} />
        <Route path="*" element={<p role="alert">You don't have access to this page.</p>} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
