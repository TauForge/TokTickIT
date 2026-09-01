import { Router } from "express";
import { prisma } from "../prisma";
import { resolveDevRequester } from "../middleware/devRequester";
import { validateCreateTicketRequest } from "../validators/createTicketRequest";
import { generateTicketNumber } from "../services/ticketNumber";
import { HttpError } from "../middleware/errorEnvelope";

export const ticketsRouter = Router();

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

    res.status(201).json({
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
    });
  } catch (error) {
    next(error);
  }
});
