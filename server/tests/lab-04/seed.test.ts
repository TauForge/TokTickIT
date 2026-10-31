import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "child_process";
import path from "path";
import { prisma } from "../../src/prisma";

const SERVER_DIR = path.resolve(__dirname, "../..");
const runSeed = () => execFileSync("npx", ["tsx", "prisma/seed.ts"], { cwd: SERVER_DIR, env: process.env, stdio: "pipe" });

async function counts() {
  const [users, tickets, actions, seedTickets] = await Promise.all([
    prisma.user.count(),
    prisma.ticket.count(),
    prisma.actionTaken.count(),
    prisma.ticket.count({ where: { ticketNumber: { startsWith: "SEED4-" } } }),
  ]);
  return { users, tickets, actions, seedTickets };
}

describe("SEED-01: seed run twice (AC-24, BR-24)", () => {
  let first: Awaited<ReturnType<typeof counts>>;
  let second: Awaited<ReturnType<typeof counts>>;

  beforeAll(async () => {
    runSeed();
    first = await counts();
    runSeed();
    second = await counts();
  }, 60_000);

  it("produces identical counts and no duplicates on the second run", () => {
    expect(second).toEqual(first);
    expect(first.seedTickets).toBe(12);
  });

  it("covers all 8 statuses, LOW/MEDIUM/HIGH, assigned and unassigned", async () => {
    const tickets = await prisma.ticket.findMany({ where: { ticketNumber: { startsWith: "SEED4-" } } });
    expect(new Set(tickets.map((t) => t.status)).size).toBe(8);
    expect(new Set(tickets.map((t) => t.itPriority))).toEqual(new Set(["LOW", "MEDIUM", "HIGH"]));
    expect(tickets.some((t) => t.ownerId === null)).toBe(true);
    expect(tickets.some((t) => t.ownerId !== null)).toBe(true);
  });

  it("has Tickets with 0, 1 and 3 Actions, each Action by an IT Staff or Administrator", async () => {
    const tickets = await prisma.ticket.findMany({
      where: { ticketNumber: { startsWith: "SEED4-" } },
      include: { actions: { include: { performedBy: true } } },
    });
    const sizes = new Set(tickets.map((t) => t.actions.length));
    expect(sizes.has(0) && sizes.has(1) && sizes.has(3)).toBe(true);
    for (const a of tickets.flatMap((t) => t.actions)) expect(a.performedBy.role).not.toBe("REQUESTER");
  });

  it("adds the zero-state Requester with no Tickets", async () => {
    const u = await prisma.user.findUnique({ where: { email: "empty.requester@toktickit.dev" } });
    expect(u?.role).toBe("REQUESTER");
    expect(await prisma.ticket.count({ where: { requesterId: u!.id } })).toBe(0);
  });
});
