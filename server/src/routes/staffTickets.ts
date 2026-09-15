import { Router } from "express";
import type { TicketStatus as PrismaTicketStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireRole, blockIfPasswordChangeRequired } from "../middleware/auth";
import { parseStaffTicketQuery } from "../validators/staffTicketQuery";

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

export { staffGate };
