import { Router } from "express";
import { prisma } from "../prisma";
import { staffGate } from "./staffTickets";
import { HttpError } from "../middleware/errorEnvelope";
import { validateCommentBody } from "../validators/commentRequest";
import { toCommentDto } from "./comments";

export const staffCommentsRouter = Router({ mergeParams: true });

async function loadTicketId(ticketId: string): Promise<string> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found");
  return ticket.id;
}

staffCommentsRouter.get("/", ...staffGate, async (req, res, next) => {
  try {
    const ticketId = await loadTicketId(String((req.params as Record<string, string>).ticketId));
    const comments = await prisma.comment.findMany({
      where: { ticketId },
      include: { author: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(comments.map(toCommentDto));
  } catch (error) {
    next(error);
  }
});

staffCommentsRouter.post("/", ...staffGate, async (req, res, next) => {
  try {
    const ticketId = await loadTicketId(String((req.params as Record<string, string>).ticketId));
    const validation = validateCommentBody(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const comment = await prisma.comment.create({
      data: { ticketId, authorId: req.user!.id, authorRole: req.user!.role, body: validation.value.body },
      include: { author: { select: { id: true, displayName: true } } },
    });
    res.status(201).json(toCommentDto(comment));
  } catch (error) {
    next(error);
  }
});
