import { Router, Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { prisma } from "../prisma";
import { resolveDevRequester } from "../middleware/devRequester";
import { HttpError } from "../middleware/errorEnvelope";
import {
  isAllowedAttachmentFile,
  MAX_ATTACHMENT_BYTES,
  MAX_ACTIVE_ATTACHMENTS_PER_TICKET,
  saveAttachmentFile,
} from "../services/storage";

// Set multer's own limit well above 5MB and rely on the explicit file.size check below for the
// real 413 boundary. If multer's own limit were set to MAX_ATTACHMENT_BYTES (or close to it),
// any file that actually exceeds it throws a MulterError before the route body runs, and that
// error is not an HttpError — the errorEnvelope middleware would otherwise map it to a raw 500
// instead of a 413. The upload.single(...) call below still catches MulterError explicitly as a
// second safety net.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const attachmentsRouter = Router({ mergeParams: true });

function toAttachmentDto(a: {
  id: string;
  ticketId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isRemoved: boolean;
  removedAt: Date | null;
  removedReason: string | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    ticketId: a.ticketId,
    filename: a.filename,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    isRemoved: a.isRemoved,
    removedAt: a.removedAt,
    removedReason: a.removedReason,
    downloadUrl: a.isRemoved ? null : `/api/attachments/${a.id}/download`,
    createdAt: a.createdAt,
  };
}

async function loadOwnedTicket(ticketId: string, requesterId: number) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.requesterId !== requesterId) {
    throw new HttpError(404, "NOT_FOUND", "Ticket not found");
  }
  return ticket;
}

function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
      next(new HttpError(413, "FILE_TOO_LARGE", "Attachment exceeds the 5 MB limit"));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

attachmentsRouter.post("/", resolveDevRequester, handleUpload, async (req, res, next) => {
  try {
    const ticket = await loadOwnedTicket(String(req.params.ticketId), req.requester!.id);
    const file = req.file;

    if (!file) {
      throw new HttpError(422, "VALIDATION_FAILED", "A file is required", [{ field: "file", message: "A file is required." }]);
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new HttpError(413, "FILE_TOO_LARGE", "Attachment exceeds the 5 MB limit");
    }
    if (!isAllowedAttachmentFile(file.originalname, file.mimetype)) {
      throw new HttpError(415, "UNSUPPORTED_FILE_TYPE", "Attachment type is not allowed");
    }

    // BR-14's 5-active-attachment cap is enforced by locking the parent ticket row for the
    // duration of the count-check-and-insert, inside one transaction. A plain count() then
    // create() (two separate statements) is a TOCTOU race: two concurrent uploads can both read
    // 4 active attachments and both insert, landing at 6. SELECT ... FOR UPDATE on the ticket
    // row serializes concurrent uploads for the SAME ticket (uploads to different tickets are
    // unaffected and still run concurrently).
    const storedName = await saveAttachmentFile(file.buffer, file.originalname);
    // Saved to disk before the DB transaction: if the transaction below then fails or the cap
    // is hit, this leaves at worst an orphaned, harmless file on disk (cleanable later) — the
    // reverse order (insert row, then write file) risks the opposite failure mode instead: an
    // active Attachment row whose file does not exist, which would 200 a download request into
    // a crash. Orphaned-file is the safer failure to risk between the two.
    const attachment = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticket.id} FOR UPDATE`;
      const activeCount = await tx.attachment.count({ where: { ticketId: ticket.id, isRemoved: false } });
      if (activeCount >= MAX_ACTIVE_ATTACHMENTS_PER_TICKET) {
        throw new HttpError(409, "ATTACHMENT_LIMIT_REACHED", "This ticket already has 5 active attachments");
      }
      return tx.attachment.create({
        data: {
          ticketId: ticket.id,
          uploadedById: req.requester!.id,
          filename: file.originalname,
          storedName,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });
    });

    res.status(201).json(toAttachmentDto(attachment));
  } catch (error) {
    next(error);
  }
});

attachmentsRouter.get("/", resolveDevRequester, async (req, res, next) => {
  try {
    const ticketId = (req.params as Record<string, string>).ticketId;
    const ticket = await loadOwnedTicket(String(ticketId), req.requester!.id);
    const attachments = await prisma.attachment.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(attachments.map(toAttachmentDto));
  } catch (error) {
    next(error);
  }
});

export { toAttachmentDto, loadOwnedTicket };
