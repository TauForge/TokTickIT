import { Router } from "express";
import { prisma } from "../prisma";
import { staffGate } from "./staffTickets";
import { HttpError } from "../middleware/errorEnvelope";
import { validateCommentBody } from "../validators/commentRequest";

export const staffNotesRouter = Router({ mergeParams: true });

export function toInternalNoteDto(n: {
  id: number;
  ticketId: string;
  body: string;
  author: { id: number; displayName: string };
  createdAt: Date;
}) {
  return { id: n.id, ticketId: n.ticketId, body: n.body, author: n.author, createdAt: n.createdAt };
}

async function loadTicketId(ticketId: string): Promise<string> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found");
  return ticket.id;
}

// BR-04: Internal Notes are a separate model with their own route surface — there is no
// shared query or flag with Comment, so a Requester-facing endpoint structurally cannot
// leak note content. This router itself is only ever reachable behind staffGate.
staffNotesRouter.get("/", ...staffGate, async (req, res, next) => {
  try {
    const ticketId = await loadTicketId(String((req.params as Record<string, string>).ticketId));
    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      include: { author: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(notes.map(toInternalNoteDto));
  } catch (error) {
    next(error);
  }
});

staffNotesRouter.post("/", ...staffGate, async (req, res, next) => {
  try {
    const ticketId = await loadTicketId(String((req.params as Record<string, string>).ticketId));
    const validation = validateCommentBody(req.body);
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const note = await prisma.internalNote.create({
      data: { ticketId, authorId: req.user!.id, body: validation.value.body },
      include: { author: { select: { id: true, displayName: true } } },
    });
    res.status(201).json(toInternalNoteDto(note));
  } catch (error) {
    next(error);
  }
});
