import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let staffCookie: string[];
let requesterCookie: string[];
let categoryId: number;

async function createTicket(requestedPriority = "LOW"): Promise<{ id: string; requestedPriority: string }> {
  const response = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", requesterCookie)
    .send({ summary: "Priority fixture", description: "Used across this file's tests.", categoryId, requestedPriority });
  return { id: response.body.id, requestedPriority: response.body.requestedPriority };
}

beforeAll(async () => {
  const staffLogin = await request(app).post("/api/v1/auth/login").send({ email: "amy.tran@toktickit.dev", password: "DevPass123!" });
  staffCookie = staffLogin.headers["set-cookie"];
  const requesterLogin = await request(app).post("/api/v1/auth/login").send({ email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" });
  requesterCookie = requesterLogin.headers["set-cookie"];
  categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
});

describe("PATCH /api/v1/staff/tickets/:id/priority", () => {
  it("AC-12/BR-17: changes itPriority and leaves requestedPriority unchanged", async () => {
    const ticket = await createTicket("LOW");
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticket.id}/priority`)
      .set("Cookie", staffCookie)
      .send({ itPriority: "HIGH" });

    expect(response.status).toBe(200);
    expect(response.body.itPriority).toBe("HIGH");
    expect(response.body.requestedPriority).toBe(ticket.requestedPriority);
  });

  it("422 for an invalid priority value", async () => {
    const ticket = await createTicket();
    const response = await request(app).patch(`/api/v1/staff/tickets/${ticket.id}/priority`).set("Cookie", staffCookie).send({ itPriority: "URGENT" });
    expect(response.status).toBe(422);
  });

  it("409 TICKET_LOCKED for a CANCELLED ticket", async () => {
    const ticket = await createTicket();
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: "CANCELLED" } });
    const response = await request(app).patch(`/api/v1/staff/tickets/${ticket.id}/priority`).set("Cookie", staffCookie).send({ itPriority: "HIGH" });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("TICKET_LOCKED");
  });

  it("403 for a Requester", async () => {
    const ticket = await createTicket();
    const response = await request(app).patch(`/api/v1/staff/tickets/${ticket.id}/priority`).set("Cookie", requesterCookie).send({ itPriority: "HIGH" });
    expect(response.status).toBe(403);
  });
});
