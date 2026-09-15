export interface StaffTicketQuery {
  search?: string;
  status?: string;
  ownerId?: number | "unassigned";
  itPriority?: "LOW" | "MEDIUM" | "HIGH";
  sort: "createdAt" | "updatedAt";
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const SORT_FIELDS = ["createdAt", "updatedAt"];

// BR-25: default sort createdAt desc, default page size 20, capped at 50; any
// invalid/out-of-range value falls back to the default rather than erroring.
export function parseStaffTicketQuery(raw: Record<string, unknown>): StaffTicketQuery {
  const page = Number(raw.page);
  const pageSize = Number(raw.pageSize);

  let ownerId: number | "unassigned" | undefined;
  if (raw.ownerId === "unassigned") {
    ownerId = "unassigned";
  } else if (raw.ownerId !== undefined) {
    const n = Number(raw.ownerId);
    ownerId = Number.isInteger(n) ? n : undefined;
  }

  return {
    search: typeof raw.search === "string" && raw.search.trim() ? raw.search.trim() : undefined,
    status: STATUSES.includes(String(raw.status)) ? String(raw.status) : undefined,
    ownerId,
    itPriority: PRIORITIES.includes(String(raw.itPriority)) ? (raw.itPriority as StaffTicketQuery["itPriority"]) : undefined,
    sort: SORT_FIELDS.includes(String(raw.sort)) ? (raw.sort as StaffTicketQuery["sort"]) : "createdAt",
    order: raw.order === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 && pageSize <= 50 ? pageSize : 20,
  };
}
