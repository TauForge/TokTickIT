import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

const PASSWORD = "DevPass123!";
async function login(email: string): Promise<string[]> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: PASSWORD });
  return res.headers["set-cookie"] as unknown as string[];
}

let amy: string[];
let carlos: string[];
let admin: string[];
let jennifer: string[];
let michael: string[];
let amyId: number;
let ticketId: string;
let cancelledTicketId: string;
const base = (id: string) => `/api/v1/staff/tickets/${id}/actions`;
const validBody = { description: "Replaced the faulty cable", result: "Link restored" };

async function newTicket(cookie: string[], summary: string): Promise<string> {
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const res = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", cookie)
    .send({ summary, description: "Lab 4 actions fixture.", categoryId, requestedPriority: "LOW" });
  return res.body.id;
}

beforeAll(async () => {
  [amy, carlos, admin, jennifer, michael] = await Promise.all([
    login("amy.tran@toktickit.dev"),
    login("carlos.mendez@toktickit.dev"),
    login("admin@toktickit.dev"),
    login("jennifer.anderson@toktickit.dev"),
    login("michael.brown@toktickit.dev"),
  ]);
  amyId = (await prisma.user.findUnique({ where: { email: "amy.tran@toktickit.dev" } }))!.id;
  ticketId = await newTicket(jennifer, "Lab4 actions main fixture");
  cancelledTicketId = await newTicket(jennifer, "Lab4 actions cancelled fixture");
  await prisma.ticket.update({ where: { id: cancelledTicketId }, data: { status: "CANCELLED" } });
});

describe("API-01: create Action as IT Staff (AC-01, BR-03)", () => {
  it("saves under the Ticket with performer from the session, ignoring body performer", async () => {
    const res = await request(app)
      .post(base(ticketId))
      .set("Cookie", amy)
      .send({ ...validBody, performedBy: 999999, performedById: 999999 });
    expect(res.status).toBe(201);
    expect(res.body.ticketId).toBe(ticketId);
    expect(res.body.performedBy).toMatchObject({ id: amyId, displayName: "Amy Tran", role: "IT_STAFF" });
    expect(res.body).toMatchObject({ followUpRequired: false, followUpNote: null, attachmentNotes: null, version: 0 });
    const row = await prisma.actionTaken.findUnique({ where: { id: res.body.id } });
    expect(row?.performedById).toBe(amyId);
  });

  it("401 without a session", async () => {
    expect((await request(app).post(base(ticketId)).send(validBody)).status).toBe(401);
  });

  it("404 for an unknown Ticket", async () => {
    const res = await request(app).post(base("00000000-0000-0000-0000-000000000000")).set("Cookie", amy).send(validBody);
    expect(res.status).toBe(404);
  });
});

describe("API-02: non-owner staff creates Action (AC-03, BR-02)", () => {
  it("returns 201 and leaves the Ticket owner unchanged", async () => {
    const t = await newTicket(jennifer, "Lab4 owner fixture");
    await request(app).patch(`/api/v1/staff/tickets/${t}/owner`).set("Cookie", amy).send({ ownerId: amyId, expectedVersion: 0 });
    const res = await request(app).post(base(t)).set("Cookie", carlos).send(validBody);
    expect(res.status).toBe(201);
    const after = await prisma.ticket.findUnique({ where: { id: t } });
    expect(after?.ownerId).toBe(amyId);
  });
});

describe("API-03: follow-up rule (AC-04, AC-05)", () => {
  it("422 when followUpRequired without a note", async () => {
    const res = await request(app).post(base(ticketId)).set("Cookie", amy).send({ ...validBody, followUpRequired: true });
    expect(res.status).toBe(422);
    expect(res.body.error.fieldErrors[0].field).toBe("followUpNote");
  });
  it("422 when a note is supplied without followUpRequired", async () => {
    const res = await request(app).post(base(ticketId)).set("Cookie", amy).send({ ...validBody, followUpNote: "stale" });
    expect(res.status).toBe(422);
  });
  it("201 with a note when followUpRequired is true", async () => {
    const res = await request(app)
      .post(base(ticketId))
      .set("Cookie", amy)
      .send({ ...validBody, followUpRequired: true, followUpNote: "Check again Monday", attachmentNotes: "photo on file" });
    expect(res.status).toBe(201);
    expect(res.body.followUpNote).toBe("Check again Monday");
  });
});

describe("API-04: Requester create/update Action (AC-06, BR-10)", () => {
  it("403 on create and on update, nothing written", async () => {
    const before = await prisma.actionTaken.count({ where: { ticketId } });
    const create = await request(app).post(base(ticketId)).set("Cookie", jennifer).send(validBody);
    expect(create.status).toBe(403);
    const existing = await prisma.actionTaken.findFirst({ where: { ticketId } });
    const patch = await request(app)
      .patch(`${base(ticketId)}/${existing!.id}`)
      .set("Cookie", jennifer)
      .send({ expectedVersion: 0, result: "hacked" });
    expect(patch.status).toBe(403);
    expect(await prisma.actionTaken.count({ where: { ticketId } })).toBe(before);
    expect((await prisma.actionTaken.findUnique({ where: { id: existing!.id } }))?.result).not.toBe("hacked");
  });
});

describe("API-05: Requester lists Actions (AC-07, AC-08)", () => {
  it("owner gets 200 in stable order", async () => {
    const t = await newTicket(jennifer, "Lab4 order fixture");
    await prisma.ticket.update({ where: { id: t }, data: { createdAt: new Date(Date.now() - 86_400_000) } });
    const late = new Date(Date.now() - 60_000).toISOString();
    const early = new Date(Date.now() - 3_600_000).toISOString();
    await request(app).post(base(t)).set("Cookie", amy).send({ ...validBody, description: "second", actionAt: late });
    await request(app).post(base(t)).set("Cookie", amy).send({ ...validBody, description: "first", actionAt: early });
    const res = await request(app).get(`/api/v1/tickets/${t}/actions`).set("Cookie", jennifer);
    expect(res.status).toBe(200);
    expect(res.body.map((a: { description: string }) => a.description)).toEqual(["first", "second"]);
  });
  it("another Requester gets 404", async () => {
    expect((await request(app).get(`/api/v1/tickets/${ticketId}/actions`).set("Cookie", michael)).status).toBe(404);
  });
  it("staff gets 403 on the Requester route, anonymous 401", async () => {
    expect((await request(app).get(`/api/v1/tickets/${ticketId}/actions`).set("Cookie", amy)).status).toBe(403);
    expect((await request(app).get(`/api/v1/tickets/${ticketId}/actions`)).status).toBe(401);
  });
  it("staff list works and a Requester on the staff route gets 403", async () => {
    const list = await request(app).get(base(ticketId)).set("Cookie", carlos);
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);
    expect((await request(app).get(base(ticketId)).set("Cookie", jennifer)).status).toBe(403);
  });
});

describe("API-06: update by non-performer / performer / admin (AC-09, BR-08)", () => {
  it("403 / 200 / 200 with version bumps and 422/409 version rules", async () => {
    const created = await request(app).post(base(ticketId)).set("Cookie", amy).send(validBody);
    const url = `${base(ticketId)}/${created.body.id}`;

    expect((await request(app).patch(url).set("Cookie", carlos).send({ expectedVersion: 0, result: "x" })).status).toBe(403);

    const byPerformer = await request(app).patch(url).set("Cookie", amy).send({ expectedVersion: 0, result: "Updated by performer" });
    expect(byPerformer.status).toBe(200);
    expect(byPerformer.body).toMatchObject({ result: "Updated by performer", version: 1 });
    expect(byPerformer.body.performedBy.id).toBe(amyId);

    const byAdmin = await request(app).patch(url).set("Cookie", admin).send({ expectedVersion: 1, description: "Admin edit" });
    expect(byAdmin.status).toBe(200);
    expect(byAdmin.body.version).toBe(2);
    expect(byAdmin.body.performedBy.id).toBe(amyId);

    const missing = await request(app).patch(url).set("Cookie", amy).send({ result: "no version" });
    expect(missing.status).toBe(422);
    expect(missing.body.error.code).toBe("VERSION_REQUIRED");

    const stale = await request(app).patch(url).set("Cookie", amy).send({ expectedVersion: 0, result: "stale write" });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("STALE_UPDATE");
    expect(stale.body.error.currentVersion).toBe(2);
    expect((await prisma.actionTaken.findUnique({ where: { id: created.body.id } }))?.result).toBe("Updated by performer");
  });
  it("404 for an action id that belongs to another Ticket", async () => {
    const other = await newTicket(jennifer, "Lab4 mismatch fixture");
    const a = await prisma.actionTaken.findFirst({ where: { ticketId } });
    const res = await request(app).patch(`${base(other)}/${a!.id}`).set("Cookie", amy).send({ expectedVersion: 0, result: "x" });
    expect(res.status).toBe(404);
  });
});

describe("API-07: DELETE Action (AC-10, BR-07)", () => {
  it("404 and the row remains", async () => {
    const a = await prisma.actionTaken.findFirst({ where: { ticketId } });
    const res = await request(app).delete(`${base(ticketId)}/${a!.id}`).set("Cookie", admin);
    expect(res.status).toBe(404);
    expect(await prisma.actionTaken.findUnique({ where: { id: a!.id } })).not.toBeNull();
  });
});

describe("API-08: Action on CANCELLED Ticket (AC-18, BR-09)", () => {
  it("409 TICKET_LOCKED on create and update", async () => {
    const create = await request(app).post(base(cancelledTicketId)).set("Cookie", amy).send(validBody);
    expect(create.status).toBe(409);
    expect(create.body.error.code).toBe("TICKET_LOCKED");

    const seeded = await prisma.actionTaken.create({
      data: { ticketId: cancelledTicketId, performedById: amyId, actionAt: new Date(), description: "d", result: "r" },
    });
    const patch = await request(app)
      .patch(`${base(cancelledTicketId)}/${seeded.id}`)
      .set("Cookie", amy)
      .send({ expectedVersion: 0, result: "x" });
    expect(patch.status).toBe(409);
    expect(patch.body.error.code).toBe("TICKET_LOCKED");
  });
});

describe("API-09: Idempotency-Key (AC-17, BR-18)", () => {
  it("second request returns 200 with the original and creates one row", async () => {
    const t = await newTicket(jennifer, "Lab4 idempotency fixture");
    const key = `key-${Date.now()}-abcdef`;
    const first = await request(app).post(base(t)).set("Cookie", amy).set("Idempotency-Key", key).send(validBody);
    const second = await request(app)
      .post(base(t))
      .set("Cookie", amy)
      .set("Idempotency-Key", key)
      .send({ ...validBody, description: "different body" });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.description).toBe(validBody.description);
    expect(await prisma.actionTaken.count({ where: { ticketId: t } })).toBe(1);
  });
  it("422 for a key outside 8-64 characters", async () => {
    const short = await request(app).post(base(ticketId)).set("Cookie", amy).set("Idempotency-Key", "short").send(validBody);
    expect(short.status).toBe(422);
    const long = await request(app).post(base(ticketId)).set("Cookie", amy).set("Idempotency-Key", "k".repeat(65)).send(validBody);
    expect(long.status).toBe(422);
  });
  it("the same key from a different user creates a separate Action", async () => {
    const key = `shared-${Date.now()}-key`;
    const a = await request(app).post(base(ticketId)).set("Cookie", amy).set("Idempotency-Key", key).send(validBody);
    const c = await request(app).post(base(ticketId)).set("Cookie", carlos).set("Idempotency-Key", key).send(validBody);
    expect(a.status).toBe(201);
    expect(c.status).toBe(201);
    expect(c.body.id).not.toBe(a.body.id);
  });
});

describe("API-24: Idempotency-Key is scoped to its ticket (review on PR #49)", () => {
  it("409 IDEMPOTENCY_KEY_REUSED when the same performer reuses a key on another ticket", async () => {
    const t1 = await newTicket(jennifer, "Lab4 key scope fixture 1");
    const t2 = await newTicket(jennifer, "Lab4 key scope fixture 2");
    const key = `scope-${Date.now()}-key`;
    const first = await request(app).post(base(t1)).set("Cookie", amy).set("Idempotency-Key", key).send(validBody);
    const second = await request(app).post(base(t2)).set("Cookie", amy).set("Idempotency-Key", key).send(validBody);
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(await prisma.actionTaken.count({ where: { ticketId: t2 } })).toBe(0);
  });
});

describe("API-25: terminal-status check and write are atomic (review on PR #49)", () => {
  it("create is rejected when the ticket closes while the request is in flight", async () => {
    const t = await newTicket(jennifer, "Lab4 atomic create fixture");
    let pending!: Promise<request.Response>;
    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({ where: { id: t }, data: { status: "CLOSED" } }); // row lock held, uncommitted
      pending = Promise.resolve(request(app).post(base(t)).set("Cookie", amy).send(validBody));
      await new Promise((r) => setTimeout(r, 300));
    });
    const res = await pending;
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("TICKET_LOCKED");
    expect(await prisma.actionTaken.count({ where: { ticketId: t } })).toBe(0);
  });

  it("edit is rejected when the ticket closes while the request is in flight", async () => {
    const t = await newTicket(jennifer, "Lab4 atomic edit fixture");
    const created = await request(app).post(base(t)).set("Cookie", amy).send(validBody);
    let pending!: Promise<request.Response>;
    await prisma.$transaction(async (tx) => {
      await tx.ticket.update({ where: { id: t }, data: { status: "CLOSED" } });
      pending = Promise.resolve(
        request(app)
          .patch(`${base(t)}/${created.body.id}`)
          .set("Cookie", amy)
          .send({ expectedVersion: 0, result: "Changed after close" }),
      );
      await new Promise((r) => setTimeout(r, 300));
    });
    const res = await pending;
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("TICKET_LOCKED");
    expect((await prisma.actionTaken.findUnique({ where: { id: created.body.id } }))?.result).toBe(validBody.result);
  });
});
