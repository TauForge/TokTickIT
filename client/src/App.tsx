import "bootstrap/dist/css/bootstrap.min.css";
import "./theme/zen-green.css";

import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./api/authContext";
import { RoleBadge } from "./components/badges";
import { Login } from "./screens/Login";
import { ChangePassword } from "./screens/ChangePassword";
import { CreateTicket } from "./screens/CreateTicket";
import { MyTickets } from "./screens/MyTickets";
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
  return <CreateTicket onCreated={(ticket) => navigate(`/tickets/${ticket.id}`)} />;
}

function homeFor(role: string): string {
  if (role === "IT_STAFF") return "/staff/tickets";
  if (role === "ADMINISTRATOR") return "/admin/users";
  return "/tickets";
}

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
        <nav>
          {user.role === "REQUESTER" && (
            <>
              <Link to="/tickets">My Tickets</Link>
              <Link to="/tickets/new">Create Ticket</Link>
            </>
          )}
          {user.role === "IT_STAFF" && (
            <>
              <Link to="/staff/tickets">My Queue</Link>
              <Link to="/tickets/new">Create Ticket</Link>
            </>
          )}
          {user.role === "ADMINISTRATOR" && <Link to="/admin/users">Admin</Link>}
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
        {user.role === "REQUESTER" && (
          <>
            <Route path="/tickets" element={<MyTickets />} />
            <Route path="/tickets/new" element={<CreateTicketRoute />} />
            <Route path="/tickets/:id" element={<TicketDetailRoute />} />
          </>
        )}
        {user.role === "IT_STAFF" && (
          <>
            <Route path="/staff/tickets" element={<StaffTicketQueue />} />
            <Route path="/staff/tickets/:id" element={<StaffTicketDetailRoute />} />
            <Route path="/tickets/new" element={<CreateTicketRoute />} />
            <Route path="/tickets/:id" element={<TicketDetailRoute />} />
          </>
        )}
        {user.role === "ADMINISTRATOR" && <Route path="/admin/users" element={<UserManagement />} />}
        <Route path="/" element={<Navigate to={homeFor(user.role)} replace />} />
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
