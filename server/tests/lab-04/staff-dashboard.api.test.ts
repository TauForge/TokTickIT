import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { execFileSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import { buildStaffDashboard } from "../../src/services/dashboards";

// API-20..23: staff dashboard (specification 6.3). Each metric is compared with an independent raw SQL query,
// and each drill-down list with its dashboard count (BR-22).
const PASSWORD = "DevPass123!";
const ACTIVE_SQL = `('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`;
const RUN = Date.now();

async function login(email: string): Promise<string[]> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: PASSWORD });
  return res.headers["set-cookie"] as unknown as string[];
}

let staff: string[];
let admin: string[];
let requester: string[];
let staffId: number;

async function n(query: string, ...params: unknown[]): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM ${query}`, ...params);
  return Number(rows[0].n);
}

beforeAll(async () => {
  [staff, admin, requester] = await Promise.all([
    login("amy.tran@toktickit.dev"),
    login("admin@toktickit.dev"),
    login("jennifer.anderson@toktickit.dev"),
  ]);
  const amy = await prisma.user.findUniqueOrThrow({ where: { email: "amy.tran@toktickit.dev" } });
  const carlos = await prisma.user.findUniqueOrThrow({ where: { email: "carlos.mendez@toktickit.dev" } });
  const jen = await prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@toktickit.dev" } });
  staffId = amy.id;
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;

  // A spread of statuses, owners and priorities so every metric has a non-trivial value.
  const combos: [string, number | null, string][] = [
    ["NEW", null, "HIGH"], ["OPEN", amy.id, "HIGH"], ["IN_PROGRESS", amy.id, "MEDIUM"], ["WAITING_FOR_REQUESTER", carlos.id, "LOW"],
    ["REOPENED", null, "HIGH"], ["RESOLVED", amy.id, "HIGH"], ["CLOSED", carlos.id, "LOW"], ["CANCELLED", null, "MEDIUM"],
    ["IN_PROGRESS", carlos.id, "HIGH"], ["OPEN", null, "LOW"],
  ];
  let i = 0;
  for (const [status, ownerId, itPriority] of combos) {
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `SDASH-${RUN}-${i++}`, summary: `Staff dashboard fixture ${i}`, description: "fixture",
        status: status as never, requestedPriority: "LOW", itPriority: itPriority as never, requesterId: jen.id, categoryId, ownerId,
      },
    });
    if (i <= 7) {
      await prisma.actionTaken.create({
        data: { ticketId: t.id, performedById: amy.id, actionAt: new Date(RUN - i * 1000), description: `Fixture action ${i}`, result: "ok" },
      });
    }
  }
}, 60_000);

const dash = (c?: string[]) => {
  const req = request(app).get("/api/v1/dashboard/staff");
  return c ? req.set("Cookie", c) : req;
};
const queue = async (qs: string) => (await request(app).get(`/api/v1/staff/tickets?${qs}&pageSize=1`).set("Cookie", staff)).body.meta.totalItems as number;

describe("API-20: staff metrics vs SQL and drill-down equality (AC-19, AC-21)", () => {
  it("each count equals an independent SQL count", async () => {
    const { body } = await dash(staff);
    expect(body.counts).toEqual({
      new: await n(`"Ticket" WHERE status = 'NEW'`),
      open: await n(`"Ticket" WHERE status = 'OPEN'`),
      inProgress: await n(`"Ticket" WHERE status = 'IN_PROGRESS'`),
      waitingForRequester: await n(`"Ticket" WHERE status = 'WAITING_FOR_REQUESTER'`),
      myAssigned: await n(`"Ticket" WHERE status IN ${ACTIVE_SQL} AND "ownerId" = $1`, staffId),
      unassigned: await n(`"Ticket" WHERE status IN ${ACTIVE_SQL} AND "ownerId" IS NULL`),
      byItPriority: {
        LOW: await n(`"Ticket" WHERE status IN ${ACTIVE_SQL} AND "itPriority" = 'LOW'`),
        MEDIUM: await n(`"Ticket" WHERE status IN ${ACTIVE_SQL} AND "itPriority" = 'MEDIUM'`),
        HIGH: await n(`"Ticket" WHERE status IN ${ACTIVE_SQL} AND "itPriority" = 'HIGH'`),
      },
    });
    expect(body.counts.myAssigned).toBeGreaterThan(0);
  });

  it("urgent: active HIGH, oldest createdAt first, top 5", async () => {
    const { body } = await dash(staff);
    const expected = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "Ticket" WHERE status IN ${ACTIVE_SQL} AND "itPriority" = 'HIGH' ORDER BY "createdAt" ASC, id ASC LIMIT 5`,
    );
    expect(body.urgent.map((r: { id: string }) => r.id)).toEqual(expected.map((r) => r.id));
    expect(Object.keys(body.urgent[0]).sort()).toEqual(["id", "itPriority", "ownerDisplayName", "status", "summary", "ticketNumber", "updatedAt"]);
  });

  it("recentlyUpdated: top 5 by updatedAt desc over all Tickets", async () => {
    const { body } = await dash(staff);
    const expected = await prisma.$queryRawUnsafe<{ id: string }[]>(`SELECT id FROM "Ticket" ORDER BY "updatedAt" DESC, id ASC LIMIT 5`);
    expect(body.recentlyUpdated.map((r: { id: string }) => r.id)).toEqual(expected.map((r) => r.id));
  });

  it("myRecentActions: caller's Actions by actionAt desc, top 5", async () => {
    const { body } = await dash(staff);
    const expected = await prisma.$queryRawUnsafe<{ id: string; ticketNumber: string }[]>(
      `SELECT a.id, t."ticketNumber" FROM "ActionTaken" a JOIN "Ticket" t ON t.id = a."ticketId"
       WHERE a."performedById" = $1 ORDER BY a."actionAt" DESC, a.id ASC LIMIT 5`,
      staffId,
    );
    expect(body.myRecentActions.map((r: { id: string }) => r.id)).toEqual(expected.map((r) => r.id));
    expect(body.myRecentActions.map((r: { ticketNumber: string }) => r.ticketNumber)).toEqual(expected.map((r) => r.ticketNumber));
    expect(Object.keys(body.myRecentActions[0]).sort()).toEqual(["actionAt", "description", "id", "ticketId", "ticketNumber"]);
  });

  it("each drill-down list total equals its dashboard count", async () => {
    const { body } = await dash(staff);
    const c = body.counts;
    expect(await queue("status=NEW")).toBe(c.new);
    expect(await queue("status=OPEN")).toBe(c.open);
    expect(await queue("status=IN_PROGRESS")).toBe(c.inProgress);
    expect(await queue("status=WAITING_FOR_REQUESTER")).toBe(c.waitingForRequester);
    expect(await queue(`ownerId=${staffId}&activeOnly=true`)).toBe(c.myAssigned);
    expect(await queue("ownerId=unassigned&activeOnly=true")).toBe(c.unassigned);
    for (const p of ["LOW", "MEDIUM", "HIGH"]) expect(await queue(`itPriority=${p}&activeOnly=true`)).toBe(c.byItPriority[p]);
  });

  it("401 anonymous, 403 Requester, no data", async () => {
    const anon = await dash();
    expect(anon.status).toBe(401);
    expect(anon.body.counts).toBeUndefined();
    const req = await dash(requester);
    expect(req.status).toBe(403);
    expect(req.body.counts).toBeUndefined();
  });
});

describe("API-21: userCounts for Administrator only (AC-22)", () => {
  it("Administrator gets userCounts equal to SQL", async () => {
    const { status, body } = await dash(admin);
    expect(status).toBe(200);
    expect(body.userCounts).toEqual({
      active: await n(`"User" WHERE "isActive" = true`),
      inactive: await n(`"User" WHERE "isActive" = false`),
      requester: await n(`"User" WHERE role = 'REQUESTER'`),
      itStaff: await n(`"User" WHERE role = 'IT_STAFF'`),
      administrator: await n(`"User" WHERE role = 'ADMINISTRATOR'`),
    });
  });

  it("IT Staff response has no userCounts key", async () => {
    const { status, body } = await dash(staff);
    expect(status).toBe(200);
    expect("userCounts" in body).toBe(false);
  });
});

describe("API-22: empty database (AC-20)", () => {
  const SCRATCH_DB = "toktickit_dash_empty_test";
  const base = new URL(process.env.DATABASE_URL!);
  const adminUrl = new URL(base.toString());
  adminUrl.pathname = "/postgres";
  const scratchUrl = new URL(base.toString());
  scratchUrl.pathname = `/${SCRATCH_DB}`;
  const psql = (url: URL, args: string[]) => execFileSync("psql", [url.toString().split("?")[0], "-v", "ON_ERROR_STOP=1", "-X", "-q", ...args], { encoding: "utf8" });
  let scratch: PrismaClient;

  beforeAll(() => {
    psql(adminUrl, ["-c", `DROP DATABASE IF EXISTS ${SCRATCH_DB}`]);
    psql(adminUrl, ["-c", `CREATE DATABASE ${SCRATCH_DB}`]);
    const dir = path.resolve(__dirname, "../../prisma/migrations");
    for (const d of readdirSync(dir).filter((x) => /^\d{14}_/.test(x)).sort()) psql(scratchUrl, ["-f", path.join(dir, d, "migration.sql")]);
    scratch = new PrismaClient({ datasourceUrl: scratchUrl.toString() });
  }, 60_000);

  afterAll(async () => {
    await scratch?.$disconnect();
    psql(adminUrl, ["-c", `DROP DATABASE IF EXISTS ${SCRATCH_DB}`]);
  });

  it("returns zeros and empty arrays for staff and Administrator", async () => {
    const zeros = { new: 0, open: 0, inProgress: 0, waitingForRequester: 0, myAssigned: 0, unassigned: 0, byItPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 } };
    const asStaff = await buildStaffDashboard(scratch, { id: 1, role: "IT_STAFF" });
    expect(asStaff.counts).toEqual(zeros);
    expect([asStaff.urgent, asStaff.recentlyUpdated, asStaff.myRecentActions]).toEqual([[], [], []]);
    expect("userCounts" in asStaff).toBe(false);
    const asAdmin = await buildStaffDashboard(scratch, { id: 1, role: "ADMINISTRATOR" });
    expect(asAdmin.userCounts).toEqual({ active: 0, inactive: 0, requester: 0, itStaff: 0, administrator: 0 });
  });
});

describe("API-23: queue activeOnly and ownerId (FR-18)", () => {
  const list = async (qs: string) => (await request(app).get(`/api/v1/staff/tickets?${qs}&pageSize=50`).set("Cookie", staff)).body.data as { status: string; ownerId: number | null }[];
  const ACTIVE = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];

  it("activeOnly=true returns only active statuses and matches SQL", async () => {
    const rows = await list("activeOnly=true");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => ACTIVE.includes(r.status))).toBe(true);
    expect(await queue("activeOnly=true")).toBe(await n(`"Ticket" WHERE status IN ${ACTIVE_SQL}`));
  });

  it("ownerId accepts a user id or 'unassigned'", async () => {
    expect((await list(`ownerId=${staffId}`)).every((r) => r.ownerId === staffId)).toBe(true);
    expect((await list("ownerId=unassigned")).every((r) => r.ownerId === null)).toBe(true);
    expect(await queue("ownerId=unassigned")).toBe(await n(`"Ticket" WHERE "ownerId" IS NULL`));
  });

  it("status wins when it names a non-active status", async () => {
    const rows = await list("activeOnly=true&status=RESOLVED");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === "RESOLVED")).toBe(true);
    expect((await list("activeOnly=true&status=OPEN")).every((r) => r.status === "OPEN")).toBe(true);
  });

  it("activeOnly other than 'true' is ignored", async () => {
    expect(await queue("activeOnly=false")).toBe(await n(`"Ticket"`));
  });
});
