// server/tests/lab-03/staffAttachments.api.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let staffCookie: string[];
let requesterCookie: string[];
let ticketId: string;

beforeAll(async () => {
  const staffLogin = await request(app).post("/api/v1/auth/login").send({ email: "amy.tran@toktickit.dev", password: "DevPass123!" });
  staffCookie = staffLogin.headers["set-cookie"];
  const requesterLogin = await request(app).post("/api/v1/auth/login").send({ email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" });
  requesterCookie = requesterLogin.headers["set-cookie"];
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const ticket = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", requesterCookie)
    .send({ summary: "Staff attachments fixture", description: "Used across this file's tests.", categoryId, requestedPriority: "LOW" });
  ticketId = ticket.body.id;
  await request(app)
    .post(`/api/v1/tickets/${ticketId}/attachments`)
    .set("Cookie", requesterCookie)
    .attach("file", Buffer.from("staff view fixture"), { filename: "notes.png", contentType: "image/png" });
});

describe("GET /api/v1/staff/tickets/:id/attachments", () => {
  it("FR-18: lists the ticket's attachments read-only for IT Staff", async () => {
    const response = await request(app).get(`/api/v1/staff/tickets/${ticketId}/attachments`).set("Cookie", staffCookie);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].filename).toBe("notes.png");
  });

  it("403 for a Requester", async () => {
    const response = await request(app).get(`/api/v1/staff/tickets/${ticketId}/attachments`).set("Cookie", requesterCookie);
    expect(response.status).toBe(403);
  });

  it("FR-18: no staff upload route exists — POST returns 404, not 403 or 201", async () => {
    const response = await request(app)
      .post(`/api/v1/staff/tickets/${ticketId}/attachments`)
      .set("Cookie", staffCookie)
      .attach("file", Buffer.from("should not be accepted"), "reject.txt");
    expect(response.status).toBe(404);
  });
});
