import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";
import type { TicketStatus } from "../../src/services/ticketStatusTransitions";
import { PATCH_VALID } from "./transitionMatrix";

const PASSWORD = "DevPass123!";
async function login(email: string): Promise<string[]> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: PASSWORD });
  return res.headers["set-cookie"] as unknown as string[];
}

const ALL: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
let amy: string[];
let jennifer: string[];
let amyId: number;

const url = (id: string, part: string) => `/api/v1/staff/tickets/${id}/${part}`;
const versionOf = async (id: string) => (await prisma.ticket.findUniqueOrThrow({ where: { id } })).version;

async function newTicket(summary: string): Promise<string> {
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const res = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", jennifer)
    .send({ summary, description: "Lab 4 workflow fixture.", categoryId, requestedPriority: "LOW" });
  return res.body.id;
}

const addAction = (ticketId: string) =>
  prisma.actionTaken.create({ data: { ticketId, performedById: amyId, actionAt: new Date(), description: "Fixture action", result: "Done" } });

const setStatus = (id: string, status: TicketStatus) => prisma.ticket.update({ where: { id }, data: { status, version: 0 } });

beforeAll(async () => {
  [amy, jennifer] = await Promise.all([login("amy.tran@toktickit.dev"), login("jennifer.anderson@toktickit.dev")]);
  amyId = (await prisma.user.findUniqueOrThrow({ where: { email: "amy.tran@toktickit.dev" } })).id;
});

describe("API-10: resolution gate (AC-11, BR-13)", () => {
  it("409 RESOLUTION_REQUIRES_ACTION with zero Actions, then 200 after one Action", async () => {
    const t = await newTicket("Lab4 gate fixture");
    await setStatus(t, "IN_PROGRESS");

    const blocked = await request(app).patch(url(t, "status")).set("Cookie", amy).send({ status: "RESOLVED", expectedVersion: 0 });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("RESOLUTION_REQUIRES_ACTION");
    const unchanged = await prisma.ticket.findUniqueOrThrow({ where: { id: t } });
    expect(unchanged).toMatchObject({ status: "IN_PROGRESS", version: 0 });

    await addAction(t);
    const ok = await request(app).patch(url(t, "status")).set("Cookie", amy).send({ status: "RESOLVED", expectedVersion: 0 });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: "RESOLVED", version: 1 });
  });
});

describe("API-11: advisory flag is not resolution (AC-12, BR-14)", () => {
  it("flag leaves status unchanged and the gate still returns 409", async () => {
    const t = await newTicket("Lab4 advisory fixture");
    await setStatus(t, "IN_PROGRESS");
    const before = await versionOf(t);
    const flag = await request(app).patch(`/api/v1/tickets/${t}/resolved-indication`).set("Cookie", jennifer).send({});
    expect(flag.status).toBe(200);
    expect(flag.body.status).toBe("IN_PROGRESS");

    // Review on PR #50: the advisory flag must not bump version (BR-16).
    expect(await versionOf(t)).toBe(before);
    const v = await versionOf(t);
    const gate = await request(app).patch(url(t, "status")).set("Cookie", amy).send({ status: "RESOLVED", expectedVersion: v });
    expect(gate.status).toBe(409);
    expect(gate.body.error.code).toBe("RESOLUTION_REQUIRES_ACTION");
  });
});

describe("API-12: every status pair through PATCH (AC-13)", () => {
  const pairs = ALL.flatMap((from) => ALL.map((to) => [from, to] as [TicketStatus, TicketStatus]));
  const valid = new Set(PATCH_VALID.map(([f, t]) => `${f}>${t}`));
  let t: string;

  beforeAll(async () => {
    t = await newTicket("Lab4 matrix fixture");
    await addAction(t); // so RESOLVED is gated only by the matrix here
  });

  it.each(pairs)("%s -> %s", async (from, to) => {
    await setStatus(t, from);
    const res = await request(app).patch(url(t, "status")).set("Cookie", amy).send({ status: to, expectedVersion: 0 });
    if (valid.has(`${from}>${to}`)) {
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(to);
      expect(res.body.version).toBe(1);
    } else {
      expect(res.status).toBe(409);
      const terminal = from === "CLOSED" || from === "CANCELLED";
      expect(res.body.error.code).toBe(terminal ? "TICKET_LOCKED" : "INVALID_STATUS_TRANSITION");
      expect(await versionOf(t)).toBe(0);
    }
  });
});

describe("API-13: REOPENED is no longer a dead end (AC-14)", () => {
  it("REOPENED to IN_PROGRESS returns 200", async () => {
    const t = await newTicket("Lab4 reopen fixture");
    await setStatus(t, "REOPENED");
    const res = await request(app).patch(url(t, "status")).set("Cookie", amy).send({ status: "IN_PROGRESS", expectedVersion: 0 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("IN_PROGRESS");
  });

  it("assigning an owner moves REOPENED to OPEN automatically", async () => {
    const t = await newTicket("Lab4 reopen owner fixture");
    await setStatus(t, "REOPENED");
    const res = await request(app).patch(url(t, "owner")).set("Cookie", amy).send({ ownerId: amyId, expectedVersion: 0 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OPEN");
  });
});

describe("API-14: stale update (AC-15, BR-17)", () => {
  it("status write after a priority change returns 409 STALE_UPDATE with currentVersion and writes nothing", async () => {
    const t = await newTicket("Lab4 stale fixture");
    await setStatus(t, "OPEN");
    const prio = await request(app).patch(url(t, "priority")).set("Cookie", amy).send({ itPriority: "HIGH", expectedVersion: 0 });
    expect(prio.status).toBe(200);
    expect(prio.body.version).toBe(1);

    const stale = await request(app).patch(url(t, "status")).set("Cookie", amy).send({ status: "IN_PROGRESS", expectedVersion: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("STALE_UPDATE");
    expect(stale.body.error.currentVersion).toBe(1);
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: t } })).toMatchObject({ status: "OPEN", version: 1 });
  });

  it("two concurrent writes with the same version: exactly one wins", async () => {
    const t = await newTicket("Lab4 race fixture");
    const results = await Promise.all(
      ["HIGH", "MEDIUM"].map((itPriority) => request(app).patch(url(t, "priority")).set("Cookie", amy).send({ itPriority, expectedVersion: 0 })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await versionOf(t)).toBe(1);
  });

  it("stale check precedes the business rule", async () => {
    const t = await newTicket("Lab4 order fixture");
    await setStatus(t, "CANCELLED");
    const res = await request(app).patch(url(t, "priority")).set("Cookie", amy).send({ itPriority: "HIGH", expectedVersion: 5 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("STALE_UPDATE");
  });
});

describe("API-15: expectedVersion required (AC-16, BR-17)", () => {
  it.each([
    ["owner", { ownerId: 1 }],
    ["priority", { itPriority: "HIGH" }],
    ["status", { status: "CANCELLED" }],
  ])("422 VERSION_REQUIRED on %s", async (part, body) => {
    const t = await newTicket("Lab4 version-required fixture");
    const res = await request(app).patch(url(t, part)).set("Cookie", amy).send(body);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VERSION_REQUIRED");
    expect(await versionOf(t)).toBe(0);
  });

  it("422 VERSION_REQUIRED on Action PATCH", async () => {
    const t = await newTicket("Lab4 action version fixture");
    const a = await addAction(t);
    const res = await request(app).patch(`/api/v1/staff/tickets/${t}/actions/${a.id}`).set("Cookie", amy).send({ result: "x" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VERSION_REQUIRED");
  });
});

describe("API-16: Requester cannot write status (BR-15)", () => {
  it("403 and nothing changes", async () => {
    const t = await newTicket("Lab4 requester status fixture");
    const res = await request(app).patch(url(t, "status")).set("Cookie", jennifer).send({ status: "CANCELLED", expectedVersion: 0 });
    expect(res.status).toBe(403);
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: t } })).toMatchObject({ status: "NEW", version: 0 });
  });
});

describe("version exposure (AC-15)", () => {
  it("staff list, staff detail and Requester detail all carry version", async () => {
    const t = await newTicket("Lab4 version exposure fixture");
    const detail = await request(app).get(`/api/v1/staff/tickets/${t}`).set("Cookie", amy);
    expect(detail.body.version).toBe(0);
    const list = await request(app).get("/api/v1/staff/tickets?search=Lab4 version exposure").set("Cookie", amy);
    expect(list.body.data[0].version).toBe(0);
    const mine = await request(app).get(`/api/v1/tickets/${t}`).set("Cookie", jennifer);
    expect(mine.body.version).toBe(0);
  });
});

describe("API-26: gate and status write share one transaction (review on PR #50)", () => {
  it("racing Action create against move to RESOLVED never leaves a RESOLVED ticket with zero Actions", async () => {
    const ids = await Promise.all(Array.from({ length: 8 }, (_, i) => newTicket(`Lab4 gate race fixture ${i}`)));
    await Promise.all(ids.map((t) => setStatus(t, "IN_PROGRESS")));
    const versions = await Promise.all(ids.map((t) => versionOf(t)));
    const actionBody = { description: "Racing action", result: "Recorded" };
    await Promise.all(
      ids.flatMap((t, i) => [
        request(app).post(`/api/v1/staff/tickets/${t}/actions`).set("Cookie", amy).send(actionBody),
        request(app).patch(url(t, "status")).set("Cookie", amy).send({ status: "RESOLVED", expectedVersion: versions[i] }),
      ]),
    );
    for (const t of ids) {
      const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: t } });
      const actions = await prisma.actionTaken.count({ where: { ticketId: t } });
      if (ticket.status === "RESOLVED") expect(actions).toBeGreaterThanOrEqual(1);
    }
  });
});
