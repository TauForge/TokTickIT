import { Router } from "express";
import { prisma } from "../prisma";
import { staffGate } from "./staffTickets";
import { HttpError } from "../middleware/errorEnvelope";

export const staffAttachmentsRouter = Router({ mergeParams: true });

// FR-18: read-only by design — this router only ever registers a GET handler, so any
// other verb (POST/DELETE) falls through to Express's default 404, never a 403 that
// would imply an upload/remove endpoint exists but is merely forbidden.
staffAttachmentsRouter.get("/", ...staffGate, async (req, res, next) => {
  try {
    const ticketId = String((req.params as Record<string, string>).ticketId);
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found");

    const attachments = await prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(
      attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        isRemoved: a.isRemoved,
        removedReason: a.removedReason,
        downloadUrl: a.isRemoved ? null : `/api/v1/attachments/${a.id}/download`,
        sizeBytes: a.sizeBytes,
        createdAt: a.createdAt,
      })),
    );
  } catch (error) {
    next(error);
  }
});
