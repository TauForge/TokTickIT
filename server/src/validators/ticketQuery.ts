export interface TicketQuery {
  search?: string;
  categoryId?: number;
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH";
  itPriority?: "LOW" | "MEDIUM" | "HIGH";
  status?: "NEW";
  sort: "createdAt" | "updatedAt";
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const SORT_FIELDS = ["createdAt", "updatedAt"];

export function parseTicketQuery(raw: Record<string, unknown>): TicketQuery {
  const page = Number(raw.page);
  const pageSize = Number(raw.pageSize);
  const categoryId = Number(raw.categoryId);

  return {
    search: typeof raw.search === "string" && raw.search.trim() ? raw.search.trim() : undefined,
    categoryId: raw.categoryId !== undefined && Number.isInteger(categoryId) ? categoryId : undefined,
    requestedPriority: PRIORITIES.includes(String(raw.requestedPriority))
      ? (raw.requestedPriority as TicketQuery["requestedPriority"])
      : undefined,
    itPriority: PRIORITIES.includes(String(raw.itPriority)) ? (raw.itPriority as TicketQuery["itPriority"]) : undefined,
    status: raw.status === "NEW" ? "NEW" : undefined,
    sort: SORT_FIELDS.includes(String(raw.sort)) ? (raw.sort as TicketQuery["sort"]) : "createdAt",
    order: raw.order === "asc" ? "asc" : "desc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 && pageSize <= 50 ? pageSize : 10,
  };
}
