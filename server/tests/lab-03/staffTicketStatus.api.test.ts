// server/tests/lab-03/staffTicketStatus.api.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let staffCookie: string[];
let requesterCookie: string[];
let staffUserId: number;
let categoryId: number;

async function createOpenTicket(): Promise<string> {
  const created = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", requesterCookie)
    .send({ summary: "Status transition fixture", description: "Used across this file's tests.", categoryId, requestedPriority: "LOW" });
  await request(app)
    .patch(`/api/v1/staff/tickets/${created.body.id}/owner`)
    .set("Cookie", staffCookie)
    .send({ ownerId: staffUserId });
  return created.body.id;
}

beforeAll(async () => {
  const staffLogin = await request(app).post("/api/v1/auth/login").send({ email: "amy.tran@toktickit.dev", password: "DevPass123!" });
  staffCookie = staffLogin.headers["set-cookie"];
  const staffUser = await prisma.user.findUniqueOrThrow({ where: { email: "amy.tran@toktickit.dev" } });
  staffUserId = staffUser.id;
  const requesterLogin = await request(app).post("/api/v1/auth/login").send({ email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" });
  requesterCookie = requesterLogin.headers["set-cookie"];
  categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
});

describe("PATCH /api/v1/staff/tickets/:id/status", () => {
  it("AC-11/BR-19: OPEN -> IN_PROGRESS is a valid transition", async () => {
    const ticketId = await createOpenTicket();
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "IN_PROGRESS" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("IN_PROGRESS");
  });

  it("BR-19: OPEN -> RESOLVED (not a valid direct transition) returns 409 INVALID_STATUS_TRANSITION", async () => {
    const ticketId = await createOpenTicket();
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "RESOLVED" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("AC-11/BR-18: any transition on a CLOSED ticket other than REOPENED returns 409 TICKET_LOCKED", async () => {
    const ticketId = await createOpenTicket();
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "IN_PROGRESS" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("TICKET_LOCKED");
  });

  it("BR-18: CLOSED -> REOPENED is the one permitted transition out of a terminal status", async () => {
    const ticketId = await createOpenTicket();
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "REOPENED" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("REOPENED");
  });

  it("BR-19: any transition on a CANCELLED ticket returns 409 TICKET_LOCKED", async () => {
    const ticketId = await createOpenTicket();
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: "CANCELLED" } });
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/status`)
      .set("Cookie", staffCookie)
      .send({ status: "REOPENED" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("TICKET_LOCKED");
  });

  it("422 for an unrecognized status value", async () => {
    const ticketId = await createOpenTicket();
    const response = await request(app).patch(`/api/v1/staff/tickets/${ticketId}/status`).set("Cookie", staffCookie).send({ status: "DONE" });
    expect(response.status).toBe(422);
  });

  it("403 for a Requester", async () => {
    const ticketId = await createOpenTicket();
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/status`)
      .set("Cookie", requesterCookie)
      .send({ status: "IN_PROGRESS" });
    expect(response.status).toBe(403);
  });
});
