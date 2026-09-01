import { Router } from "express";
import { prisma } from "../prisma";
import { resolveDevRequester } from "../middleware/devRequester";
import { validateCreateTicketRequest } from "../validators/createTicketRequest";
import { parseTicketQuery } from "../validators/ticketQuery";
import { generateTicketNumber } from "../services/ticketNumber";
import { HttpError } from "../middleware/errorEnvelope";

export const ticketsRouter = Router();

function toTicketDto(ticket: {
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
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    summary: ticket.summary,
    description: ticket.description,
    categoryId: ticket.categoryId,
    categoryName: ticket.category.name,
    relatedSystemId: ticket.relatedSystemId,
    relatedSystemName: ticket.relatedSystem?.name ?? null,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    status: ticket.status,
    requesterId: ticket.requesterId,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

ticketsRouter.post("/", resolveDevRequester, async (req, res, next) => {
  try {
    const validation = validateCreateTicketRequest(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const input = validation.value;
    const requesterId = req.requester!.id;
    const year = new Date().getFullYear();

    // BR-06: Category/RelatedSystem must be active to be selectable at creation time.
    // Checked here (not left to the DB's FK constraint) so an unknown/deactivated id returns
    // 422 with a field error instead of a raw Prisma P2003 foreign-key error mapping to 500.
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category || !category.isActive) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", [
        { field: "categoryId", message: "Category is not available." },
      ]);
    }
    if (input.relatedSystemId !== undefined) {
      const relatedSystem = await prisma.relatedSystem.findUnique({ where: { id: input.relatedSystemId } });
      if (!relatedSystem || !relatedSystem.isActive) {
        throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", [
          { field: "relatedSystemId", message: "Related System is not available." },
        ]);
      }
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(tx, year);
      return tx.ticket.create({
        data: {
          ticketNumber,
          summary: input.summary,
          description: input.description,
          categoryId: input.categoryId,
          relatedSystemId: input.relatedSystemId,
          requestedPriority: input.requestedPriority,
          itPriority: input.requestedPriority,
          requesterId,
        },
        include: { category: true, relatedSystem: true },
      });
    });

    res.status(201).json(toTicketDto(ticket));
  } catch (error) {
    next(error);
  }
});

ticketsRouter.get("/", resolveDevRequester, async (req, res, next) => {
  try {
    const query = parseTicketQuery(req.query as Record<string, unknown>);
    const requesterId = req.requester!.id;

    const where = {
      requesterId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.requestedPriority ? { requestedPriority: query.requestedPriority } : {}),
      ...(query.itPriority ? { itPriority: query.itPriority } : {}),
      ...(query.status ? { status: query.status } : {}),
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
        include: { category: true, relatedSystem: true },
        // id is a secondary sort key so rows created within the same millisecond (realistic
        // under concurrent creation, e.g. Task 14's 5-concurrent-request test) still produce a
        // stable, deterministic page order instead of shuffling between pages.
        orderBy: [{ [query.sort]: query.order }, { id: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    res.status(200).json({
      items: tickets.map(toTicketDto),
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
    });
  } catch (error) {
    next(error);
  }
});

ticketsRouter.get("/:id", resolveDevRequester, async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { category: true, relatedSystem: true },
    });

    // BR-18/AC-03/FR-20: a ticket owned by another requester must look identical to a
    // nonexistent ticket (404, not 403) so requesters can't probe which ticket ids exist.
    if (!ticket || ticket.requesterId !== req.requester!.id) {
      throw new HttpError(404, "NOT_FOUND", "Ticket not found");
    }

    res.status(200).json(toTicketDto(ticket));
  } catch (error) {
    next(error);
  }
});
