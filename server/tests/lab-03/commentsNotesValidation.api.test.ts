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
    .send({ summary: "Validation fixture", description: "Used across this file's tests.", categoryId, requestedPriority: "LOW" });
  ticketId = ticket.body.id;
});

// BR-21: empty/whitespace-only content is rejected with 422 on every Comment/Internal
// Note endpoint — Requester Public Comments (Task 14), staff Public Comments and
// Internal Notes (this task) all share the one `validateCommentBody` validator, so this
// file proves the shared rule holds on both call sites, not just one.
describe("BR-21: empty/whitespace-only body validation", () => {
  it("422 for a whitespace-only Requester Public Comment", async () => {
    const response = await request(app).post(`/api/v1/tickets/${ticketId}/comments`).set("Cookie", requesterCookie).send({ body: "   " });
    expect(response.status).toBe(422);
  });

  it("422 for a whitespace-only staff Public Comment", async () => {
    const response = await request(app).post(`/api/v1/staff/tickets/${ticketId}/comments`).set("Cookie", staffCookie).send({ body: "   " });
    expect(response.status).toBe(422);
  });

  it("422 for a whitespace-only Internal Note", async () => {
    const response = await request(app).post(`/api/v1/staff/tickets/${ticketId}/notes`).set("Cookie", staffCookie).send({ body: "   " });
    expect(response.status).toBe(422);
  });
});
