import { Router } from "express";
import { prisma } from "../prisma";
import { resolveDevRequester } from "../middleware/devRequester";
import { HttpError } from "../middleware/errorEnvelope";
import { readAttachmentFile } from "../services/storage";
import { toAttachmentDto } from "./attachments";

export const attachmentActionsRouter = Router();

async function loadOwnedAttachment(id: string, requesterId: number) {
  const attachment = await prisma.attachment.findUnique({ where: { id }, include: { ticket: true } });
  if (!attachment || attachment.ticket.requesterId !== requesterId) {
    throw new HttpError(404, "NOT_FOUND", "Attachment not found");
  }
  return attachment;
}

attachmentActionsRouter.get("/:id/download", resolveDevRequester, async (req, res, next) => {
  try {
    const attachment = await loadOwnedAttachment(req.params.id, req.requester!.id);
    if (attachment.isRemoved) {
      throw new HttpError(404, "NOT_FOUND", "Attachment not found");
    }
    const buffer = await readAttachmentFile(attachment.storedName);
    res.setHeader("Content-Type", attachment.mimeType);
    // encodeURIComponent + the filename*= form avoids a malformed/invalid header (or a Node
    // ERR_INVALID_CHAR throw) if the stored original filename contains a quote, newline, or
    // other header-breaking character.
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
    );
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
});

attachmentActionsRouter.delete("/:id", resolveDevRequester, async (req, res, next) => {
  try {
    const attachment = await loadOwnedAttachment(req.params.id, req.requester!.id);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason) {
      throw new HttpError(400, "REASON_REQUIRED", "A removal reason is required");
    }

    const updated = await prisma.attachment.update({
      where: { id: attachment.id },
      data: { isRemoved: true, removedAt: new Date(), removedReason: reason },
    });

    res.status(200).json(toAttachmentDto(updated));
  } catch (error) {
    next(error);
  }
});
