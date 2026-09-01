import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api/apiClient";
import { PriorityBadge, StatusBadge } from "../components/badges";

interface TicketRow {
  id: string;
  ticketNumber: string;
  summary: string;
  categoryName: string;
  requestedPriority: string;
  itPriority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketListResponse {
  items: TicketRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface Category {
  id: number;
  name: string;
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export function MyTickets({ requesterId }: { requesterId: number }) {
  const [data, setData] = useState<TicketListResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [itPriority, setItPriority] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<"createdAt" | "updatedAt">("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Category[]>("/api/categories", requesterId)
      .then((response) => setCategories(Array.isArray(response) ? response : []))
      .catch(() => setCategories([]));
  }, [requesterId]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), sort, order });
    if (search) params.set("search", search);
    if (categoryId) params.set("categoryId", categoryId);
    if (requestedPriority) params.set("requestedPriority", requestedPriority);
    if (itPriority) params.set("itPriority", itPriority);
    if (status) params.set("status", status);

    apiGet<TicketListResponse>(`/api/tickets?${params.toString()}`, requesterId)
      .then((response) => {
        setData(response);
        setError(null);
      })
      .catch(() => setError("Unable to load your tickets right now. Please try again."));
  }, [requesterId, search, categoryId, requestedPriority, itPriority, status, sort, order, page]);

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setItPriority("");
    setStatus("");
    setPage(1);
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

  if (!data) {
    return (
      <main className="container py-5">
        <p>Loading your tickets…</p>
      </main>
    );
  }

  const hasAnyFilter = Boolean(search || categoryId || requestedPriority || itPriority || status);

  return (
    <main className="container py-5">
      <h1 className="h4 mb-3">My Tickets</h1>

      <div className="row g-2 align-items-end mb-3">
        <div className="col-auto">
          <label htmlFor="my-tickets-search" className="form-label">
            Search
          </label>
          <input
            id="my-tickets-search"
            className="form-control"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>

        <div className="col-auto">
          <label htmlFor="my-tickets-category" className="form-label">
            Category
          </label>
          <select
            id="my-tickets-category"
            className="form-select"
            value={categoryId}
            onChange={(e) => {
              setPage(1);
              setCategoryId(e.target.value);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-auto">
          <label htmlFor="my-tickets-requested-priority" className="form-label">
            Requested Priority
          </label>
          <select
            id="my-tickets-requested-priority"
            className="form-select"
            value={requestedPriority}
            onChange={(e) => {
              setPage(1);
              setRequestedPriority(e.target.value);
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
          <label htmlFor="my-tickets-it-priority" className="form-label">
            IT Priority
          </label>
          <select
            id="my-tickets-it-priority"
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
          <label htmlFor="my-tickets-status" className="form-label">
            Current Status
          </label>
          <select
            id="my-tickets-status"
            className="form-select"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
          </select>
        </div>

        <div className="col-auto">
          <label htmlFor="my-tickets-sort" className="form-label">
            Sort By
          </label>
          <select
            id="my-tickets-sort"
            className="form-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as "createdAt" | "updatedAt")}
          >
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Last Updated</option>
          </select>
        </div>

        <div className="col-auto">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
          >
            {order === "asc" ? "Ascending" : "Descending"}
          </button>
        </div>

        <div className="col-auto">
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>

        <div className="col-auto">
          <Link className="btn btn-primary" to="/tickets/new">
            Create Ticket
          </Link>
        </div>
      </div>

      {data.totalItems === 0 && !hasAnyFilter && (
        <div data-testid="my-tickets-empty-state" className="text-center py-5">
          <p>No tickets yet.</p>
          <Link className="btn btn-primary" to="/tickets/new">
            Create Ticket
          </Link>
        </div>
      )}

      {data.totalItems === 0 && hasAnyFilter && (
        <div data-testid="my-tickets-no-results" className="text-center py-5">
          <p>No tickets match your current search.</p>
          <button type="button" className="btn btn-outline-secondary" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {data.totalItems > 0 && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Created Date</th>
                <th>Summary</th>
                <th>Category</th>
                <th>Requested Priority</th>
                <th>IT Priority</th>
                <th>Current Status</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((ticket) => (
                <tr key={ticket.id}>
                  <td>
                    <Link to={`/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link>
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
                  <td>{new Date(ticket.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="d-flex justify-content-between align-items-center">
            <p className="mb-0">
              Showing {(data.page - 1) * data.pageSize + 1} to{" "}
              {Math.min(data.page * data.pageSize, data.totalItems)} of {data.totalItems} tickets
            </p>
            <div>
              <button
                type="button"
                className="btn btn-outline-secondary me-2"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={data.page >= data.totalPages}
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
