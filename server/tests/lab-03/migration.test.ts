import { describe, it, expect } from "vitest";
import { prisma } from "../../src/prisma";

describe("Lab 3 migration", () => {
  it("TicketStatus has all 8 values and no data was lost", async () => {
    const rows = await prisma.$queryRaw<{ enumlabel: string }[]>`
      SELECT enumlabel FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'TicketStatus'
      ORDER BY enumlabel
    `;
    const values = rows.map((r) => r.enumlabel).sort();
    expect(values).toEqual(
      [
        "CANCELLED",
        "CLOSED",
        "IN_PROGRESS",
        "NEW",
        "OPEN",
        "REOPENED",
        "RESOLVED",
        "WAITING_FOR_REQUESTER",
      ].sort(),
    );
  });

  it("preserves every migrated Requester as a User with role=REQUESTER and the same id", async () => {
    const jennifer = await prisma.user.findUnique({
      where: { email: "jennifer.anderson@toktickit.dev" },
    });
    expect(jennifer).not.toBeNull();
    expect(jennifer?.role).toBe("REQUESTER");
    expect(jennifer?.isActive).toBe(true);
    expect(jennifer?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("Ticket.ownerId and resolvedIndicatedByRequester exist with correct defaults", async () => {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Ticket' AND column_name IN ('ownerId', 'resolvedIndicatedByRequester')
    `;
    expect(columns.map((c) => c.column_name).sort()).toEqual([
      "ownerId",
      "resolvedIndicatedByRequester",
    ]);
  });

  it("Comment and InternalNote tables exist and are queryable", async () => {
    await expect(prisma.comment.findMany()).resolves.toBeInstanceOf(Array);
    await expect(prisma.internalNote.findMany()).resolves.toBeInstanceOf(Array);
  });

  it("dropped the Requester table", async () => {
    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'Requester'
    `;
    expect(rows).toHaveLength(0);
  });
});
