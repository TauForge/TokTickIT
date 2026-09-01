import "bootstrap/dist/css/bootstrap.min.css";
import "./theme/zen-green.css";

import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { DevRequesterProvider, useDevRequester } from "./api/devRequesterContext";
import { DevRequesterSelect } from "./screens/DevRequesterSelect";
import { CreateTicket } from "./screens/CreateTicket";
import { MyTickets } from "./screens/MyTickets";
import { TicketDetail } from "./screens/TicketDetail";

function TicketDetailRoute({ requesterId }: { requesterId: number }) {
  const { id } = useParams();
  return <TicketDetail ticketId={id ?? ""} requesterId={requesterId} />;
}

function Shell() {
  const { selectedId, requesters, clearSelection } = useDevRequester();
  const navigate = useNavigate();

  if (!selectedId) {
    return <DevRequesterSelect onContinue={() => {}} />;
  }

  const current = requesters.find((r) => r.id === selectedId);

  return (
    <div>
      <nav className="navbar navbar-expand navbar-light bg-light border-bottom px-3">
        <span className="navbar-brand">TokTickIT</span>
        <div className="navbar-nav me-auto">
          <Link className="nav-link" to="/tickets">
            My Tickets
          </Link>
          <Link className="nav-link" to="/tickets/new">
            Create Ticket
          </Link>
        </div>
        <div className="d-flex align-items-center">
          <span className="me-3">{current?.name}</span>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={clearSelection}>
            Change Requester
          </button>
        </div>
      </nav>
      <Routes>
        <Route path="/tickets" element={<MyTickets requesterId={selectedId} />} />
        <Route
          path="/tickets/new"
          element={
            <CreateTicket
              requesterId={selectedId}
              requesterName={current?.name ?? ""}
              onCreated={(ticket) => navigate(`/tickets/${ticket.id}`)}
            />
          }
        />
        <Route path="/tickets/:id" element={<TicketDetailRoute requesterId={selectedId} />} />
        <Route path="/" element={<Navigate to="/tickets" replace />} />
        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <DevRequesterProvider>
        <Shell />
      </DevRequesterProvider>
    </BrowserRouter>
  );
}
