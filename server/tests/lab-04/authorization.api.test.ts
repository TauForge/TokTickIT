import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

// AUTHZ-01: role x endpoint codes per specification 6.2, for the Lab 4 endpoints that exist so far
// (Actions Taken list/create/update and the versioned owner/priority/status writes).
const PASSWORD = "DevPass123!";
async function login(email: string): Promise<string[]> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: PASSWORD });
  return res.headers["set-cookie"] as unknown as string[];
}

let owner: string[]; // Requester who owns the Ticket
let other: string[]; // another Requester
let staff: string[]; // IT Staff, performer of the fixture Action
let staff2: string[]; // IT Staff, not the performer
let admin: string[];
let ticketId: string;
let actionId: string;
let staffId: number;

const body = { description: "Authz action", result: "Done" };

beforeAll(async () => {
  [owner, other, staff, staff2, admin] = await Promise.all([
    login("jennifer.anderson@toktickit.dev"),
    login("michael.brown@toktickit.dev"),
    login("amy.tran@toktickit.dev"),
    login("carlos.mendez@toktickit.dev"),
    login("admin@toktickit.dev"),
  ]);
  staffId = (await prisma.user.findUniqueOrThrow({ where: { email: "amy.tran@toktickit.dev" } })).id;
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const created = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", owner)
    .send({ summary: "Lab4 authz fixture", description: "Authorization matrix.", categoryId, requestedPriority: "LOW" });
  ticketId = created.body.id;
  actionId = (
    await prisma.actionTaken.create({ data: { ticketId, performedById: staffId, actionAt: new Date(), description: "Seed", result: "Seed" } })
  ).id;
});

const t = () => `/api/v1/staff/tickets/${ticketId}`;
const cookieOf = (who: string) => ({ owner, other, staff, staff2, admin })[who];

describe("AUTHZ-01: list Actions Taken", () => {
  it("401 unauthenticated", async () => expect((await request(app).get(`${t()}/actions`)).status).toBe(401));
  it("staff routes: 403 for a Requester, 200 for IT Staff and Administrator", async () => {
    expect((await request(app).get(`${t()}/actions`).set("Cookie", owner)).status).toBe(403);
    expect((await request(app).get(`${t()}/actions`).set("Cookie", staff)).status).toBe(200);
    expect((await request(app).get(`${t()}/actions`).set("Cookie", admin)).status).toBe(200);
  });
  it("Requester route: 200 for the owner, 404 for another Requester", async () => {
    const path = `/api/v1/tickets/${ticketId}/actions`;
    expect((await request(app).get(path)).status).toBe(401);
    expect((await request(app).get(path).set("Cookie", owner)).status).toBe(200);
    expect((await request(app).get(path).set("Cookie", other)).status).toBe(404);
  });
});

describe("AUTHZ-01: create Action Taken", () => {
  it("401 unauthenticated", async () => expect((await request(app).post(`${t()}/actions`).send(body)).status).toBe(401));
  it.each([
    ["owner", 403],
    ["other", 403],
    ["staff", 201],
    ["admin", 201],
  ])("%s -> %i", async (who, code) => {
    expect((await request(app).post(`${t()}/actions`).set("Cookie", cookieOf(who)!).send(body)).status).toBe(code);
  });
});

describe("AUTHZ-01: update Action Taken", () => {
  const path = () => `${t()}/actions/${actionId}`;
  it("401 unauthenticated", async () => expect((await request(app).patch(path()).send({ expectedVersion: 0 })).status).toBe(401));
  it("Requesters 403, non-performer staff 403", async () => {
    for (const who of ["owner", "other", "staff2"]) {
      expect((await request(app).patch(path()).set("Cookie", cookieOf(who)!).send({ expectedVersion: 0, result: "x" })).status).toBe(403);
    }
  });
  it("performer 200 then Administrator 200", async () => {
    expect((await request(app).patch(path()).set("Cookie", staff).send({ expectedVersion: 0, result: "by performer" })).status).toBe(200);
    expect((await request(app).patch(path()).set("Cookie", admin).send({ expectedVersion: 1, result: "by admin" })).status).toBe(200);
  });
});

describe("AUTHZ-01: PATCH ticket owner / priority / status", () => {
  const writes = (v: number): [string, Record<string, unknown>][] => [
    ["owner", { ownerId: staffId, expectedVersion: v }],
    ["priority", { itPriority: "MEDIUM", expectedVersion: v }],
    ["status", { status: "CANCELLED", expectedVersion: v }],
  ];

  it.each(["owner", "priority", "status"])("401 unauthenticated on %s", async (part) => {
    expect((await request(app).patch(`${t()}/${part}`).send({})).status).toBe(401);
  });

  it("403 for the owning Requester and another Requester on every write", async () => {
    for (const who of ["owner", "other"]) {
      for (const [part, payload] of writes(0)) {
        expect((await request(app).patch(`${t()}/${part}`).set("Cookie", cookieOf(who)!).send(payload)).status).toBe(403);
      }
    }
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })).version).toBe(0);
  });

  it("200 for IT Staff and for Administrator, version incrementing each write", async () => {
    const owned = await request(app).patch(`${t()}/owner`).set("Cookie", staff).send({ ownerId: staffId, expectedVersion: 0 });
    expect(owned.status).toBe(200);
    const prio = await request(app).patch(`${t()}/priority`).set("Cookie", admin).send({ itPriority: "MEDIUM", expectedVersion: owned.body.version });
    expect(prio.status).toBe(200);
    expect(prio.body.version).toBe(owned.body.version + 1);
    const cancel = await request(app).patch(`${t()}/status`).set("Cookie", staff).send({ status: "CANCELLED", expectedVersion: prio.body.version });
    expect(cancel.status).toBe(200);
  });
});
