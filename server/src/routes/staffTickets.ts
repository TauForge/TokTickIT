import { Router } from "express";
import type { TicketStatus as PrismaTicketStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireRole, blockIfPasswordChangeRequired } from "../middleware/auth";
import { parseStaffTicketQuery } from "../validators/staffTicketQuery";
import { HttpError } from "../middleware/errorEnvelope";
import { isTerminal, isValidTransition, TicketStatus } from "../services/ticketStatusTransitions";
import { validateOwnerRequest, validatePriorityRequest, validateStatusRequest } from "../validators/staffTicketMutationRequest";

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

staffTicketsRouter.patch("/:id/owner", ...staffGate, async (req, res, next) => {
  try {
    const validation = validateOwnerRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: String(req.params.id) } });
    if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found");
    if (isTerminal(ticket.status as TicketStatus)) {
      throw new HttpError(409, "TICKET_LOCKED", "This ticket is locked and cannot be reassigned");
    }

    // BR-14: the target must be an active IT Staff or Administrator user.
    const newOwner = await prisma.user.findUnique({ where: { id: validation.value.ownerId } });
    if (!newOwner || !newOwner.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(newOwner.role)) {
      throw new HttpError(409, "INVALID_OWNER", "The selected owner is not an active IT Staff or Administrator user");
    }

    // BR-15: the first ownership assignment auto-transitions NEW -> OPEN; a client never
    // requests this directly (it isn't in isValidTransition's PATCH-requestable set).
    const nextStatus = ticket.status === "NEW" ? "OPEN" : ticket.status;

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { ownerId: newOwner.id, status: nextStatus as TicketStatus },
      include: STAFF_DETAIL_INCLUDE,
    });
    res.status(200).json(toStaffTicketDetailDto(updated));
  } catch (error) {
    next(error);
  }
});

staffTicketsRouter.patch("/:id/priority", ...staffGate, async (req, res, next) => {
  try {
    const validation = validatePriorityRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found");
    if (isTerminal(ticket.status as TicketStatus)) {
      throw new HttpError(409, "TICKET_LOCKED", "This ticket is locked and its priority cannot change");
    }

    // BR-17: only itPriority changes here — requestedPriority is immutable after creation.
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { itPriority: validation.value.itPriority },
      include: STAFF_DETAIL_INCLUDE,
    });
    res.status(200).json(toStaffTicketDetailDto(updated));
  } catch (error) {
    next(error);
  }
});

staffTicketsRouter.patch("/:id/status", ...staffGate, async (req, res, next) => {
  try {
    const validation = validateStatusRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found");

    const from = ticket.status as TicketStatus;
    const to = validation.value.status;

    // BR-18: CLOSED only permits ->REOPENED; CANCELLED permits nothing. isTerminal(from)
    // catches both, and the isValidTransition check below still runs for CLOSED->REOPENED
    // (it is a real matrix row, not exempted by the terminal-status check alone).
    if (isTerminal(from) && !(from === "CLOSED" && to === "REOPENED")) {
      throw new HttpError(409, "TICKET_LOCKED", "This ticket is locked and its status cannot change");
    }
    if (!isValidTransition(from, to)) {
      throw new HttpError(409, "INVALID_STATUS_TRANSITION", `Cannot transition from ${from} to ${to}`);
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: to },
      include: STAFF_DETAIL_INCLUDE,
    });
    res.status(200).json(toStaffTicketDetailDto(updated));
  } catch (error) {
    next(error);
  }
});

export { staffGate };
