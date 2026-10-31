import type { PrismaClient, TicketStatus } from "@prisma/client";

// Specification 5.4 / BR-19..22: every figure is computed per request on the server with count/groupBy and
// bounded `take: 5` lists, never by loading whole Ticket collections.
export const ACTIVE_STATUSES: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const LIST_SIZE = 5;
const RESOLVED_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type Db = Pick<PrismaClient, "ticket" | "actionTaken" | "user">;
export interface DashboardCaller {
  id: number;
  role: string;
}

const countOf = (groups: { status: TicketStatus; _count: { _all: number } }[], ...statuses: TicketStatus[]) =>
  groups.filter((g) => statuses.includes(g.status)).reduce((sum, g) => sum + g._count._all, 0);

export async function buildRequesterDashboard(db: Db, requesterId: number, now = new Date()) {
  const rowSelect = { id: true, ticketNumber: true, summary: true, status: true, updatedAt: true } as const;
  const [groups, recentlyUpdated, recentlyResolved] = await Promise.all([
    db.ticket.groupBy({ by: ["status"], where: { requesterId }, _count: { _all: true } }),
    db.ticket.findMany({ where: { requesterId }, select: rowSelect, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: LIST_SIZE }),
    db.ticket.findMany({
      where: { requesterId, status: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { gte: new Date(now.getTime() - RESOLVED_WINDOW_MS) } },
      select: rowSelect,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: LIST_SIZE,
    }),
  ]);
  return {
    counts: {
      myOpen: countOf(groups, ...ACTIVE_STATUSES),
      inProgress: countOf(groups, "IN_PROGRESS"),
      waitingForMe: countOf(groups, "WAITING_FOR_REQUESTER"),
      resolved: countOf(groups, "RESOLVED"),
      closed: countOf(groups, "CLOSED"),
    },
    recentlyUpdated,
    recentlyResolved,
    generatedAt: now.toISOString(),
  };
}

const staffRow = (t: {
  id: string;
  ticketNumber: string;
  summary: string;
  status: string;
  itPriority: string;
  owner: { displayName: string } | null;
  updatedAt: Date;
}) => ({
  id: t.id,
  ticketNumber: t.ticketNumber,
  summary: t.summary,
  status: t.status,
  itPriority: t.itPriority,
  ownerDisplayName: t.owner?.displayName ?? null,
  updatedAt: t.updatedAt,
});

const STAFF_ROW_SELECT = {
  id: true,
  ticketNumber: true,
  summary: true,
  status: true,
  itPriority: true,
  updatedAt: true,
  owner: { select: { displayName: true } },
} as const;

async function buildUserCounts(db: Db) {
  const [byRole, byActive] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.user.groupBy({ by: ["isActive"], _count: { _all: true } }),
  ]);
  const role = (r: string) => byRole.find((g) => g.role === r)?._count._all ?? 0;
  const active = (a: boolean) => byActive.find((g) => g.isActive === a)?._count._all ?? 0;
  return { active: active(true), inactive: active(false), requester: role("REQUESTER"), itStaff: role("IT_STAFF"), administrator: role("ADMINISTRATOR") };
}

export async function buildStaffDashboard(db: Db, caller: DashboardCaller, now = new Date()) {
  const active = { status: { in: ACTIVE_STATUSES } };
  const [statusGroups, priorityGroups, myAssigned, unassigned, urgent, recentlyUpdated, actions, userCounts] = await Promise.all([
    db.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
    db.ticket.groupBy({ by: ["itPriority"], where: active, _count: { _all: true } }),
    db.ticket.count({ where: { ...active, ownerId: caller.id } }),
    db.ticket.count({ where: { ...active, ownerId: null } }),
    db.ticket.findMany({ where: { ...active, itPriority: "HIGH" }, select: STAFF_ROW_SELECT, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: LIST_SIZE }),
    db.ticket.findMany({ select: STAFF_ROW_SELECT, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: LIST_SIZE }),
    db.actionTaken.findMany({
      where: { performedById: caller.id },
      select: { id: true, ticketId: true, description: true, actionAt: true, ticket: { select: { ticketNumber: true } } },
      orderBy: [{ actionAt: "desc" }, { id: "asc" }],
      take: LIST_SIZE,
    }),
    caller.role === "ADMINISTRATOR" ? buildUserCounts(db) : Promise.resolve(undefined),
  ]);
  const priority = (p: string) => priorityGroups.find((g) => g.itPriority === p)?._count._all ?? 0;
  return {
    counts: {
      new: countOf(statusGroups, "NEW"),
      open: countOf(statusGroups, "OPEN"),
      inProgress: countOf(statusGroups, "IN_PROGRESS"),
      waitingForRequester: countOf(statusGroups, "WAITING_FOR_REQUESTER"),
      myAssigned,
      unassigned,
      byItPriority: { LOW: priority("LOW"), MEDIUM: priority("MEDIUM"), HIGH: priority("HIGH") },
    },
    urgent: urgent.map(staffRow),
    recentlyUpdated: recentlyUpdated.map(staffRow),
    myRecentActions: actions.map((a) => ({
      id: a.id,
      ticketId: a.ticketId,
      ticketNumber: a.ticket.ticketNumber,
      description: a.description,
      actionAt: a.actionAt,
    })),
    ...(userCounts ? { userCounts } : {}),
    generatedAt: now.toISOString(),
  };
}
