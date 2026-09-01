import "bootstrap/dist/css/bootstrap.min.css";
import "./theme/zen-green.css";

import { useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { DevRequesterProvider, useDevRequester } from "./api/devRequesterContext";
import { DevRequesterSelect } from "./screens/DevRequesterSelect";
import { CreateTicket } from "./screens/CreateTicket";
import { MyTickets } from "./screens/MyTickets";

function Shell() {
  const { selectedId, requesters, clearSelection } = useDevRequester();
  const [justCreated, setJustCreated] = useState<string | null>(null);

  if (!selectedId) {
    return <DevRequesterSelect onContinue={() => setJustCreated(null)} />;
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
              onCreated={setJustCreated}
            />
          }
        />
        <Route path="/" element={<Navigate to="/tickets" replace />} />
        <Route path="*" element={<Navigate to="/tickets" replace />} />
      </Routes>
      {justCreated && <p className="text-center mt-3">Last created: {justCreated}</p>}
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
