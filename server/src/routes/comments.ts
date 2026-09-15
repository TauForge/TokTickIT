import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireRole, blockIfPasswordChangeRequired } from "../middleware/auth";
import { HttpError } from "../middleware/errorEnvelope";
import { validateCommentBody } from "../validators/commentRequest";

export const commentsRouter = Router({ mergeParams: true });

const requesterGate = [requireAuth, blockIfPasswordChangeRequired, requireRole("REQUESTER")];

export function toCommentDto(c: {
  id: number;
  ticketId: string;
  body: string;
  authorRole: string;
  author: { id: number; displayName: string };
  createdAt: Date;
}) {
  return {
    id: c.id,
    ticketId: c.ticketId,
    body: c.body,
    authorRole: c.authorRole,
    author: { id: c.author.id, displayName: c.author.displayName },
    createdAt: c.createdAt,
  };
}

async function loadOwnedTicketId(ticketId: string, requesterId: number): Promise<string> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.requesterId !== requesterId) {
    throw new HttpError(404, "NOT_FOUND", "Ticket not found");
  }
  return ticket.id;
}

commentsRouter.get("/", ...requesterGate, async (req, res, next) => {
  try {
    const ticketId = await loadOwnedTicketId(String((req.params as Record<string, string>).ticketId), req.user!.id);
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

commentsRouter.post("/", ...requesterGate, async (req, res, next) => {
  try {
    const ticketId = await loadOwnedTicketId(String((req.params as Record<string, string>).ticketId), req.user!.id);
    const validation = validateCommentBody(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    // BR-22: author id and role populated server-side from the session, never the body.
    const comment = await prisma.comment.create({
      data: { ticketId, authorId: req.user!.id, authorRole: req.user!.role, body: validation.value.body },
      include: { author: { select: { id: true, displayName: true } } },
    });
    res.status(201).json(toCommentDto(comment));
  } catch (error) {
    next(error);
  }
});
