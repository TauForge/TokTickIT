import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let staffCookie: string[];
let staffUserId: number;
let requesterCookie: string[];
let categoryId: number;

async function createTicket(): Promise<string> {
  const response = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", requesterCookie)
    .send({ summary: "Owner assignment fixture", description: "Used across this file's tests.", categoryId, requestedPriority: "LOW" });
  return response.body.id;
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

describe("GET /api/v1/staff/tickets/:id", () => {
  it("returns the staff detail shape including requesterName and ownerDisplayName", async () => {
    const ticketId = await createTicket();
    const response = await request(app).get(`/api/v1/staff/tickets/${ticketId}`).set("Cookie", staffCookie);
    expect(response.status).toBe(200);
    expect(response.body.requesterName).toBe("Jennifer Anderson");
    expect(response.body.ownerId).toBeNull();
    expect(response.body.ownerDisplayName).toBeNull();
    expect(response.body.resolvedIndicatedByRequester).toBe(false);
  });

  it("404 for an unknown ticket id", async () => {
    const response = await request(app).get("/api/v1/staff/tickets/not-a-real-id").set("Cookie", staffCookie);
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/v1/staff/tickets/:id/owner", () => {
  it("AC-10/BR-15: claiming an unassigned ticket auto-transitions NEW -> OPEN and sets the owner", async () => {
    const ticketId = await createTicket();
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/owner`)
      .set("Cookie", staffCookie)
      .send({ ownerId: staffUserId });

    expect(response.status).toBe(200);
    expect(response.body.ownerId).toBe(staffUserId);
    expect(response.body.status).toBe("OPEN");
  });

  it("BR-14: 409 INVALID_OWNER when the target is not an active IT Staff/Administrator", async () => {
    const ticketId = await createTicket();
    const requester = await prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@toktickit.dev" } });
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/owner`)
      .set("Cookie", staffCookie)
      .send({ ownerId: requester.id });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_OWNER");
  });

  it("422 for a missing/invalid ownerId", async () => {
    const ticketId = await createTicket();
    const response = await request(app).patch(`/api/v1/staff/tickets/${ticketId}/owner`).set("Cookie", staffCookie).send({});
    expect(response.status).toBe(422);
  });

  it("403 for a Requester", async () => {
    const ticketId = await createTicket();
    const response = await request(app)
      .patch(`/api/v1/staff/tickets/${ticketId}/owner`)
      .set("Cookie", requesterCookie)
      .send({ ownerId: staffUserId });
    expect(response.status).toBe(403);
  });
});
