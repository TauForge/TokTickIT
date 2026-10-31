import { Router, Request } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireRole, blockIfPasswordChangeRequired } from "../middleware/auth";
import { HttpError } from "../middleware/errorEnvelope";
import { isTerminal, TicketStatus } from "../services/ticketStatusTransitions";
import { validateActionCreate, validateActionPatch } from "../validators/actionRequest";
import { staffGate } from "./staffTickets";

export const staffActionsRouter = Router({ mergeParams: true });
export const requesterActionsRouter = Router({ mergeParams: true });

const requesterGate = [requireAuth, blockIfPasswordChangeRequired, requireRole("REQUESTER")];
const ACTION_INCLUDE = { performedBy: { select: { id: true, displayName: true, role: true } } } as const;
const KEY_PATTERN = /^.{8,64}$/;

type ActionRow = Prisma.ActionTakenGetPayload<{ include: typeof ACTION_INCLUDE }>;

export function toActionDto(a: ActionRow) {
  return {
    id: a.id,
    ticketId: a.ticketId,
    actionAt: a.actionAt,
    description: a.description,
    result: a.result,
    followUpRequired: a.followUpRequired,
    followUpNote: a.followUpNote,
    attachmentNotes: a.attachmentNotes,
    performedBy: a.performedBy,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    version: a.version,
  };
}

const paramOf = (req: Request, name: string) => String((req.params as Record<string, string>)[name]);

async function loadTicket(id: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found");
  return ticket;
}

// BR-09: Lab 3's locked set (CLOSED, CANCELLED) also blocks Actions; CLOSED must be reopened first.
function assertNotLocked(status: string) {
  if (isTerminal(status as TicketStatus)) {
    throw new HttpError(409, "TICKET_LOCKED", "This ticket is locked and its actions cannot change");
  }
}

const listActions = (ticketId: string) =>
  prisma.actionTaken.findMany({ where: { ticketId }, include: ACTION_INCLUDE, orderBy: [{ actionAt: "asc" }, { id: "asc" }] });

staffActionsRouter.get("/", ...staffGate, async (req, res, next) => {
  try {
    const ticket = await loadTicket(paramOf(req, "ticketId"));
    res.status(200).json((await listActions(ticket.id)).map(toActionDto));
  } catch (error) {
    next(error);
  }
});

// Re-read the status under a row lock inside the write transaction, so a concurrent move to CLOSED/CANCELLED
// cannot slip between the check and the write.
async function assertTicketWritable(tx: Prisma.TransactionClient, ticketId: string) {
  const rows = await tx.$queryRaw<{ status: TicketStatus }[]>`SELECT "status" FROM "Ticket" WHERE "id" = ${ticketId} FOR SHARE`;
  if (rows.length === 0) throw new HttpError(404, "NOT_FOUND", "Ticket not found");
  assertNotLocked(rows[0].status);
}

// A key identifies one request on one ticket; reusing it on another ticket is a client error, not a replay.
function assertKeyMatchesTicket(original: { ticketId: string }, ticketId: string) {
  if (original.ticketId !== ticketId) {
    throw new HttpError(409, "IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was already used for a different ticket");
  }
}

staffActionsRouter.post("/", ...staffGate, async (req, res, next) => {
  try {
    const ticket = await loadTicket(paramOf(req, "ticketId"));
    const performedById = req.user!.id;

    const key = req.header("Idempotency-Key");
    if (key !== undefined) {
      if (!KEY_PATTERN.test(key)) {
        throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", [
          { field: "Idempotency-Key", message: "Must be 8 to 64 characters." },
        ]);
      }
      // BR-18: a repeat identifies the original request, whatever the new body says.
      const original = await prisma.actionTaken.findUnique({
        where: { performedById_idempotencyKey: { performedById, idempotencyKey: key } },
        include: ACTION_INCLUDE,
      });
      if (original) {
        assertKeyMatchesTicket(original, ticket.id);
        res.status(200).json(toActionDto(original));
        return;
      }
    }

    const validation = validateActionCreate(req.body, { ticketCreatedAt: ticket.createdAt, now: new Date() });
    if (!validation.ok) {
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    try {
      const created = await prisma.$transaction(async (tx) => {
        await assertTicketWritable(tx, ticket.id);
        return tx.actionTaken.create({
          data: { ...validation.value, ticketId: ticket.id, performedById, idempotencyKey: key ?? null },
          include: ACTION_INCLUDE,
        });
      });
      res.status(201).json(toActionDto(created));
    } catch (error) {
      // Concurrent duplicate: the DB unique pair is the real guard, so answer with the winner.
      if (key && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const original = await prisma.actionTaken.findUnique({
          where: { performedById_idempotencyKey: { performedById, idempotencyKey: key } },
          include: ACTION_INCLUDE,
        });
        if (original) {
          assertKeyMatchesTicket(original, ticket.id);
          res.status(200).json(toActionDto(original));
          return;
        }
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

staffActionsRouter.patch("/:actionId", ...staffGate, async (req, res, next) => {
  try {
    const ticket = await loadTicket(paramOf(req, "ticketId"));
    const action = await prisma.actionTaken.findUnique({ where: { id: paramOf(req, "actionId") } });
    if (!action || action.ticketId !== ticket.id) throw new HttpError(404, "NOT_FOUND", "Action not found");

    // BR-08: only the performer or an Administrator.
    if (action.performedById !== req.user!.id && req.user!.role !== "ADMINISTRATOR") {
      throw new HttpError(403, "FORBIDDEN_NOT_PERFORMER", "Only the performer or an Administrator can update this action");
    }

    const validation = validateActionPatch(req.body, action, { ticketCreatedAt: ticket.createdAt, now: new Date() });
    if (!validation.ok) {
      if (validation.versionMissing) {
        throw new HttpError(422, "VERSION_REQUIRED", "expectedVersion is required", validation.errors);
      }
      throw new HttpError(422, "VALIDATION_FAILED", "One or more fields are invalid", validation.errors);
    }

    const { expectedVersion, ...fields } = validation.value;
    const stale = (currentVersion: number) =>
      new HttpError(409, "STALE_UPDATE", "This action was changed by someone else", [], { currentVersion });
    if (action.version !== expectedVersion) throw stale(action.version);

    // BR-17: the version guard lives in the UPDATE itself, so no read-then-write race.
    const updated = await prisma.$transaction(async (tx) => {
      await assertTicketWritable(tx, ticket.id);
      const { count } = await tx.actionTaken.updateMany({
        where: { id: action.id, version: expectedVersion },
        data: { ...fields, version: { increment: 1 } },
      });
      if (count === 0) {
        const current = await tx.actionTaken.findUnique({ where: { id: action.id } });
        throw stale(current?.version ?? expectedVersion);
      }
      return tx.actionTaken.findUniqueOrThrow({ where: { id: action.id }, include: ACTION_INCLUDE });
    });
    res.status(200).json(toActionDto(updated));
  } catch (error) {
    next(error);
  }
});

requesterActionsRouter.get("/", ...requesterGate, async (req, res, next) => {
  try {
    const ticket = await loadTicket(paramOf(req, "ticketId"));
    if (ticket.requesterId !== req.user!.id) throw new HttpError(404, "NOT_FOUND", "Ticket not found");
    res.status(200).json((await listActions(ticket.id)).map(toActionDto));
  } catch (error) {
    next(error);
  }
});
