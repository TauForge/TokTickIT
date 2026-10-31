import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

// API-17..19: Requester dashboard (specification 5.4, BR-19..22). Every metric is checked against an
// independent raw SQL query, not against the route's own Prisma calls.
const PASSWORD = "DevPass123!";
const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const RUN = Date.now();
const DAY = 86_400_000;

async function login(email: string): Promise<string[]> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: PASSWORD });
  return res.headers["set-cookie"] as unknown as string[];
}

let cookie: string[];
let emptyCookie: string[];
let otherCookie: string[];
let userId: number;
let categoryId: number;

async function makeRequester(label: string) {
  const template = await prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@toktickit.dev" } });
  const email = `dash-${label}-${RUN}@toktickit.dev`;
  const user = await prisma.user.create({
    data: { email, passwordHash: template.passwordHash, displayName: `Dash ${label}`, role: "REQUESTER", isActive: true, mustChangePassword: false },
  });
  return { email, id: user.id };
}

async function makeTicket(requesterId: number, status: (typeof STATUSES)[number], n: string, ageDays = 0) {
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `DASH-${RUN}-${n}`,
      summary: `Dashboard fixture ${n}`,
      description: "Requester dashboard fixture",
      status,
      requestedPriority: "LOW",
      itPriority: "LOW",
      requesterId,
      categoryId,
    },
  });
  if (ageDays > 0) {
    await prisma.$executeRaw`UPDATE "Ticket" SET "updatedAt" = ${new Date(Date.now() - ageDays * DAY)} WHERE id = ${ticket.id}`;
  }
  return ticket;
}

beforeAll(async () => {
  categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const main = await makeRequester("main");
  const empty = await makeRequester("empty");
  const other = await makeRequester("other");
  userId = main.id;
  [cookie, emptyCookie, otherCookie] = await Promise.all([login(main.email), login(empty.email), login(other.email)]);

  // Two tickets per status for the main requester; one old RESOLVED and one old CLOSED fall outside the 30 day window.
  let n = 0;
  for (const status of STATUSES) {
    await makeTicket(main.id, status, String(n++));
    await makeTicket(main.id, status, String(n++));
  }
  await makeTicket(main.id, "RESOLVED", String(n++), 40);
  await makeTicket(main.id, "CLOSED", String(n++), 31);
  // A different requester owns tickets that must never leak into the main dashboard.
  for (const status of STATUSES) await makeTicket(other.id, status, String(n++));
}, 60_000);

const get = (c?: string[]) => {
  const req = request(app).get("/api/v1/dashboard/requester");
  return c ? req.set("Cookie", c) : req;
};

async function sqlCount(where: string, requesterId: number): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM "Ticket" WHERE "requesterId" = $1 AND ${where}`, requesterId);
  return Number(rows[0].n);
}

describe("API-17: Requester dashboard scoping (AC-02, BR-19)", () => {
  it("counts and lists only the caller's own Tickets", async () => {
    const res = await get(cookie);
    expect(res.status).toBe(200);
    const ids = [...res.body.recentlyUpdated, ...res.body.recentlyResolved].map((r: { id: string }) => r.id);
    const foreign = await prisma.ticket.count({ where: { id: { in: ids }, requesterId: { not: userId } } });
    expect(foreign).toBe(0);
    expect(res.body.counts.myOpen).toBe(await sqlCount(`status IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`, userId));
  });

  it("401 anonymous, 403 for staff and Administrator", async () => {
    expect((await get()).status).toBe(401);
    expect((await get(await login("amy.tran@toktickit.dev"))).status).toBe(403);
    expect((await get(await login("admin@toktickit.dev"))).status).toBe(403);
  });
});

describe("API-18: Requester with no Tickets (AC-20)", () => {
  it("returns zeros, empty lists and 200", async () => {
    const res = await get(emptyCookie);
    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ myOpen: 0, inProgress: 0, waitingForMe: 0, resolved: 0, closed: 0 });
    expect(res.body.recentlyUpdated).toEqual([]);
    expect(res.body.recentlyResolved).toEqual([]);
    expect(Number.isNaN(Date.parse(res.body.generatedAt))).toBe(false);
  });
});

describe("API-19: each Requester metric equals raw SQL (AC-19)", () => {
  it("counts match", async () => {
    const res = await get(cookie);
    expect(res.body.counts).toEqual({
      myOpen: await sqlCount(`status IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`, userId),
      inProgress: await sqlCount(`status = 'IN_PROGRESS'`, userId),
      waitingForMe: await sqlCount(`status = 'WAITING_FOR_REQUESTER'`, userId),
      resolved: await sqlCount(`status = 'RESOLVED'`, userId),
      closed: await sqlCount(`status = 'CLOSED'`, userId),
    });
    // 2 fixtures per status plus the aged RESOLVED and CLOSED rows.
    expect(res.body.counts).toMatchObject({ myOpen: 10, inProgress: 2, waitingForMe: 2, resolved: 3, closed: 3 });
  });

  it("recentlyUpdated is the top 5 by updatedAt desc", async () => {
    const res = await get(cookie);
    const expected = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Ticket" WHERE "requesterId" = ${userId} ORDER BY "updatedAt" DESC, id ASC LIMIT 5`;
    expect(res.body.recentlyUpdated.map((r: { id: string }) => r.id)).toEqual(expected.map((r) => r.id));
    expect(Object.keys(res.body.recentlyUpdated[0]).sort()).toEqual(["id", "status", "summary", "ticketNumber", "updatedAt"]);
  });

  it("recentlyResolved is the top 5 RESOLVED or CLOSED updated in the last 30 days", async () => {
    const res = await get(cookie);
    const expected = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Ticket" WHERE "requesterId" = ${userId} AND status IN ('RESOLVED','CLOSED')
        AND "updatedAt" >= now() - interval '30 days' ORDER BY "updatedAt" DESC, id ASC LIMIT 5`;
    expect(expected).toHaveLength(4);
    expect(res.body.recentlyResolved.map((r: { id: string }) => r.id)).toEqual(expected.map((r) => r.id));
  });
});
