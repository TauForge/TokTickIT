import { Router } from "express";
import type { Prisma, TicketStatus as PrismaTicketStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireRole, blockIfPasswordChangeRequired } from "../middleware/auth";
import { parseStaffTicketQuery } from "../validators/staffTicketQuery";
import { HttpError } from "../middleware/errorEnvelope";
import { isTerminal, isValidTransition, TicketStatus } from "../services/ticketStatusTransitions";
import { parseExpectedVersion, validateOwnerRequest, validatePriorityRequest, validateStatusRequest } from "../validators/staffTicketMutationRequest";

export const staffTicketsRouter = Router();

const staffGate = [requireAuth, blockIfPasswordChangeRequired, requireRole("IT_STAFF", "ADMINISTRATOR")];

export function toStaffTicketListItemDto(t: {
  id: string;
  ticketNumber: string;
  createdAt: Date;
  summary: string;
  category: { name: string };
  requestedPriority: string;
  itPriority: string;
  status: string;
  ownerId: number | null;
  owner: { displayName: string } | null;
  version: number;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    createdAt: t.createdAt,
    summary: t.summary,
    categoryName: t.category.name,
    requestedPriority: t.requestedPriority,
    itPriority: t.itPriority,
    status: t.status,
    ownerId: t.ownerId,
    ownerDisplayName: t.owner?.displayName ?? null,
    version: t.version,
    updatedAt: t.updatedAt,
  };
}

staffTicketsRouter.get("/", ...staffGate, async (req, res, next) => {
  try {
    const query = parseStaffTicketQuery(req.query as Record<string, unknown>);

    const where = {
      ...(query.status ? { status: query.status as PrismaTicketStatus } : {}),
      ...(query.itPriority ? { itPriority: query.itPriority } : {}),
      ...(query.ownerId === "unassigned"
        ? { ownerId: null }
        : query.ownerId !== undefined
          ? { ownerId: query.ownerId }
          : {}),
      ...(query.search
        ? {
            OR: [
              { summary: { contains: query.search, mode: "insensitive" as const } },
              { ticketNumber: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [totalItems, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: { category: true, owner: { select: { displayName: true } } },
        orderBy: [{ [query.sort]: query.order }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    res.status(200).json({
      data: tickets.map(toStaffTicketListItemDto),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
});

const STAFF_DETAIL_INCLUDE = {
  category: true,
  relatedSystem: true,
  requester: { select: { displayName: true } },
  owner: { select: { displayName: true } },
} as const;

export function toStaffTicketDetailDto(t: {
  id: string;
  ticketNumber: string;
  summary: string;
  description: string;
  categoryId: number;
  category: { name: string };
  relatedSystemId: number | null;
  relatedSystem: { name: string } | null;
  requestedPriority: string;
  itPriority: string;
  status: string;
  requesterId: number;
  requester: { displayName: string };
  ownerId: number | null;
  owner: { displayName: string } | null;
  resolvedIndicatedByRequester: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    summary: t.summary,
    description: t.description,
    categoryId: t.categoryId,
    categoryName: t.category.name,
    relatedSystemId: t.relatedSystemId,
    relatedSystemName: t.relatedSystem?.name ?? null,
    requestedPriority: t.requestedPriority,
    itPriority: t.itPriority,
    status: t.status,
    requesterId: t.requesterId,
    requesterName: t.requester.displayName,
    ownerId: t.ownerId,
    ownerDisplayName: t.owner?.displayName ?? null,
    resolvedIndicatedByRequester: t.resolvedIndicatedByRequester,
    version: t.version,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

staffTicketsRouter.get("/:id", ...staffGate, async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: String(req.params.id) }, include: STAFF_DETAIL_INCLUDE });
    if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found");
    res.status(200).json(toStaffTicketDetailDto(ticket));
  } catch (error) {
    next(error);
  }
});

const stale = (currentVersion: number) =>
  new HttpError(409, "STALE_UPDATE", "This ticket was changed by someone else", [], { currentVersion });

async function loadTicketForWrite(id: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found");
  return ticket;
}

// BR-17: 422 when the version is absent, 422 on field errors, then the stale check.
function requireVersion(body: unknown): number {
  const expectedVersion = parseExpectedVersion(body);
  if (expectedVersion === null) {
    throw new HttpError(422, "VERSION_REQUIRED", "expectedVersion is required", [
      { field: "expectedVersion", message: "expectedVersion is required." },
    ]);
  }
  return expectedVersion;
}

// The version guard lives in the UPDATE itself (no read-then-write race); `beforeCommit`
// runs inside the same transaction so rules like the resolution gate cannot be raced.
async function guardedUpdate(
  ticketId: string,
  expectedVersion: number,
  data: Prisma.TicketUncheckedUpdateManyInput,
  beforeCommit?: (tx: Prisma.TransactionClient) => Promise<void>,
) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.ticket.updateMany({
      where: { id: ticketId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (count === 0) {
      const current = await tx.ticket.findUnique({ where: { id: ticketId } });
      throw stale(current?.version ?? expectedVersion);
    }
    if (beforeCommit) await beforeCommit(tx);
    return tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: STAFF_DETAIL_INCLUDE });
  });
}

staffTicketsRouter.patch("/:id/owner", ...staffGate, async (req, res, next) => {
  try {
    const ticket = await loadTicketForWrite(String(req.params.id));
    const expectedVersion = requireVersion(req.body);
    const validation = validateOwnerRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }
    if (ticket.version !== expectedVersion) throw stale(ticket.version);
    if (isTerminal(ticket.status as TicketStatus)) {
      throw new HttpError(409, "TICKET_LOCKED", "This ticket is locked and cannot be reassigned");
    }

    // BR-14: the target must be an active IT Staff or Administrator user.
    const newOwner = await prisma.user.findUnique({ where: { id: validation.value.ownerId } });
    if (!newOwner || !newOwner.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(newOwner.role)) {
      throw new HttpError(409, "INVALID_OWNER", "The selected owner is not an active IT Staff or Administrator user");
    }

    // BR-12: the first ownership assignment auto-transitions NEW -> OPEN (and REOPENED -> OPEN);
    // a client never requests this directly.
    const nextStatus = ticket.status === "NEW" || ticket.status === "REOPENED" ? "OPEN" : ticket.status;
    const updated = await guardedUpdate(ticket.id, expectedVersion, { ownerId: newOwner.id, status: nextStatus });
    res.status(200).json(toStaffTicketDetailDto(updated));
  } catch (error) {
    next(error);
  }
});

staffTicketsRouter.patch("/:id/priority", ...staffGate, async (req, res, next) => {
  try {
    const ticket = await loadTicketForWrite(String(req.params.id));
    const expectedVersion = requireVersion(req.body);
    const validation = validatePriorityRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }
    if (ticket.version !== expectedVersion) throw stale(ticket.version);
    if (isTerminal(ticket.status as TicketStatus)) {
      throw new HttpError(409, "TICKET_LOCKED", "This ticket is locked and its priority cannot change");
    }

    // Lab 3 BR-17: only itPriority changes here; requestedPriority is immutable after creation.
    const updated = await guardedUpdate(ticket.id, expectedVersion, { itPriority: validation.value.itPriority });
    res.status(200).json(toStaffTicketDetailDto(updated));
  } catch (error) {
    next(error);
  }
});

staffTicketsRouter.patch("/:id/status", ...staffGate, async (req, res, next) => {
  try {
    const ticket = await loadTicketForWrite(String(req.params.id));
    const expectedVersion = requireVersion(req.body);
    const validation = validateStatusRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }
    if (ticket.version !== expectedVersion) throw stale(ticket.version);

    const from = ticket.status as TicketStatus;
    const to = validation.value.status;

    // BR-11: CLOSED only permits ->REOPENED; CANCELLED permits nothing.
    if (isTerminal(from) && !(from === "CLOSED" && to === "REOPENED")) {
      throw new HttpError(409, "TICKET_LOCKED", "This ticket is locked and its status cannot change");
    }
    if (!isValidTransition(from, to)) {
      throw new HttpError(409, "INVALID_STATUS_TRANSITION", `Cannot transition from ${from} to ${to}`);
    }

    // BR-13: the gate runs inside the same transaction as the (version-guarded) status write.
    const gate =
      to === "RESOLVED"
        ? async (tx: Prisma.TransactionClient) => {
            if ((await tx.actionTaken.count({ where: { ticketId: ticket.id } })) === 0) {
              throw new HttpError(409, "RESOLUTION_REQUIRES_ACTION", "Record at least one Action Taken before resolving this ticket");
            }
          }
        : undefined;
    const updated = await guardedUpdate(ticket.id, expectedVersion, { status: to }, gate);
    res.status(200).json(toStaffTicketDetailDto(updated));
  } catch (error) {
    next(error);
  }
});

export { staffGate };
