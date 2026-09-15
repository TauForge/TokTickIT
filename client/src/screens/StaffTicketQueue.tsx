import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, ApiRequestError } from "../api/apiClient";
import { PriorityBadge, StatusBadge } from "../components/badges";

interface StaffTicketListItem {
  id: string;
  ticketNumber: string;
  createdAt: string;
  summary: string;
  categoryName: string;
  requestedPriority: string;
  itPriority: string;
  status: string;
  ownerId: number | null;
  ownerDisplayName: string | null;
  updatedAt: string;
}

interface StaffTicketPage {
  data: StaffTicketListItem[];
  meta: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export function StaffTicketQueue() {
  const [result, setResult] = useState<StaffTicketPage | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [itPriority, setItPriority] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [sort, setSort] = useState<"createdAt" | "updatedAt">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), sort, order });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (itPriority) params.set("itPriority", itPriority);
    if (ownerId) params.set("ownerId", ownerId);

    apiGet<StaffTicketPage>(`/api/v1/staff/tickets?${params.toString()}`)
      .then((response) => {
        setResult(response);
        setForbidden(false);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.message.toLowerCase().includes("forbidden")) {
          setForbidden(true);
        } else {
          setError("Unable to load the ticket queue right now. Please try again.");
        }
      });
  }, [search, status, itPriority, ownerId, sort, order, page]);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setItPriority("");
    setOwnerId("");
    setPage(1);
  }

  if (forbidden) {
    return (
      <main className="container py-5">
        <p role="alert">You don't have access to this page.</p>
      </main>
    );
  }
  if (error) {
    return (
      <main className="container py-5">
        <p role="alert" className="text-danger">
          {error}
        </p>
      </main>
    );
  }
  if (!result) {
    return (
      <main className="container py-5">
        <p>Loading the ticket queue…</p>
      </main>
    );
  }

  const hasAnyFilter = Boolean(search || status || itPriority || ownerId);

  return (
    <main className="container py-5">
      <h1 className="h4 mb-3">My Queue</h1>

      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto">
          <label htmlFor="staff-queue-search" className="form-label">
            Search
          </label>
          <input
            id="staff-queue-search"
            className="form-control"
            placeholder="Search by ticket number or summary…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <div className="col-auto">
          <label htmlFor="staff-queue-status" className="form-label">
            Status
          </label>
          <select
            id="staff-queue-status"
            className="form-select"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <label htmlFor="staff-queue-priority" className="form-label">
            IT Priority
          </label>
          <select
            id="staff-queue-priority"
            className="form-select"
            value={itPriority}
            onChange={(e) => {
              setPage(1);
              setItPriority(e.target.value);
            }}
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="col-auto">
          <label htmlFor="staff-queue-owner" className="form-label">
            Owner
          </label>
          <select
            id="staff-queue-owner"
            className="form-select"
            value={ownerId}
            onChange={(e) => {
              setPage(1);
              setOwnerId(e.target.value);
            }}
          >
            <option value="">All Owners</option>
            <option value="unassigned">No Owner</option>
          </select>
        </div>
        <div className="col-auto">
          <label htmlFor="staff-queue-sort" className="form-label">
            Sort By
          </label>
          <select id="staff-queue-sort" className="form-select" value={sort} onChange={(e) => setSort(e.target.value as "createdAt" | "updatedAt")}>
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Last Updated</option>
          </select>
        </div>
        <div className="col-auto">
          <button type="button" className="btn btn-outline-secondary" onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}>
            {order === "asc" ? "Ascending" : "Descending"}
          </button>
        </div>
        <div className="col-auto">
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {result.meta.totalItems === 0 && !hasAnyFilter && (
        <div data-testid="staff-queue-empty-state" className="zg-empty-state">
          <p>No tickets yet.</p>
        </div>
      )}

      {result.meta.totalItems === 0 && hasAnyFilter && (
        <div data-testid="staff-queue-no-results" className="zg-no-results-state">
          <p>No tickets match your current search.</p>
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {result.meta.totalItems > 0 && (
        <>
          <table className="table zg-table">
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Created Date</th>
                <th>Summary</th>
                <th>Category</th>
                <th>Req. Priority</th>
                <th>IT Priority</th>
                <th>Status</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <Link to={`/staff/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link>
                  </td>
                  <td>{new Date(ticket.createdAt).toLocaleString()}</td>
                  <td>{ticket.summary}</td>
                  <td>{ticket.categoryName}</td>
                  <td>
                    <PriorityBadge value={ticket.requestedPriority} kind="requested" />
                  </td>
                  <td>
                    <PriorityBadge value={ticket.itPriority} kind="it" />
                  </td>
                  <td>
                    <StatusBadge value={ticket.status} />
                  </td>
                  <td className={ticket.ownerDisplayName ? undefined : "text-muted"}>{ticket.ownerDisplayName ?? "Unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-flex justify-content-between align-items-center">
            <p className="mb-0">
              Showing {(result.meta.page - 1) * result.meta.pageSize + 1} to{" "}
              {Math.min(result.meta.page * result.meta.pageSize, result.meta.totalItems)} of {result.meta.totalItems} tickets
            </p>
            <div>
              <button type="button" className="btn btn-outline-secondary me-2" disabled={result.meta.page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={result.meta.page >= result.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
