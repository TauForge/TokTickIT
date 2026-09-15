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
    .send({ summary: "Internal notes fixture", description: "Used across this file's tests.", categoryId, requestedPriority: "LOW" });
  ticketId = ticket.body.id;
});

describe("Internal Notes", () => {
  it("IT Staff can post and list an Internal Note", async () => {
    const post = await request(app)
      .post(`/api/v1/staff/tickets/${ticketId}/notes`)
      .set("Cookie", staffCookie)
      .send({ body: "Waiting on vendor RMA confirmation." });
    expect(post.status).toBe(201);
    expect(post.body.author.displayName).toBe("Amy Tran");

    const list = await request(app).get(`/api/v1/staff/tickets/${ticketId}/notes`).set("Cookie", staffCookie);
    expect(list.status).toBe(200);
    expect(list.body.some((n: { body: string }) => n.body === "Waiting on vendor RMA confirmation.")).toBe(true);
  });

  it("AC-04/FR-17: a Requester gets 403 with no note content, not a filtered empty list", async () => {
    const response = await request(app).get(`/api/v1/staff/tickets/${ticketId}/notes`).set("Cookie", requesterCookie);
    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty("length");
  });

  it("AC-13/BR-04: an Internal Note never appears in the Requester's Public Comments response", async () => {
    await request(app).post(`/api/v1/staff/tickets/${ticketId}/notes`).set("Cookie", staffCookie).send({ body: "Private note, never public." });
    const requesterComments = await request(app).get(`/api/v1/tickets/${ticketId}/comments`).set("Cookie", requesterCookie);
    expect(requesterComments.body.some((c: { body: string }) => c.body === "Private note, never public.")).toBe(false);
  });
});
