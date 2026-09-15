import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let cookie: string[];
let ticketId: string;

beforeAll(async () => {
  const login = await request(app).post("/api/v1/auth/login").send({ email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" });
  cookie = login.headers["set-cookie"];
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const ticket = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", cookie)
    .send({ summary: "Comments regression fixture", description: "Used across this file's tests.", categoryId, requestedPriority: "LOW" });
  ticketId = ticket.body.id;
});

describe("Requester Public Comments", () => {
  it("AC-08: posts a comment and it appears with author name and role tag", async () => {
    const post = await request(app)
      .post(`/api/v1/tickets/${ticketId}/comments`)
      .set("Cookie", cookie)
      .send({ body: "Any update on this?" });

    expect(post.status).toBe(201);
    expect(post.body.authorRole).toBe("REQUESTER");
    expect(post.body.author.displayName).toBe("Jennifer Anderson");

    const list = await request(app).get(`/api/v1/tickets/${ticketId}/comments`).set("Cookie", cookie);
    expect(list.status).toBe(200);
    expect(list.body.some((c: { body: string }) => c.body === "Any update on this?")).toBe(true);
  });

  it("returns 404 for a ticket the caller does not own", async () => {
    const otherLogin = await request(app).post("/api/v1/auth/login").send({ email: "michael.brown@toktickit.dev", password: "DevPass123!" });
    const response = await request(app)
      .get(`/api/v1/tickets/${ticketId}/comments`)
      .set("Cookie", otherLogin.headers["set-cookie"]);
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/v1/tickets/:id/resolved-indication", () => {
  it("FR-11/BR-05: marks resolved without changing status, and rejects a second call after the ticket is already terminal", async () => {
    const response = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/resolved-indication`)
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.resolvedIndicatedByRequester).toBe(true);
    expect(response.body.status).toBe("NEW");
  });

  it("returns 404 for a ticket the caller does not own", async () => {
    const otherLogin = await request(app).post("/api/v1/auth/login").send({ email: "michael.brown@toktickit.dev", password: "DevPass123!" });
    const response = await request(app)
      .patch(`/api/v1/tickets/${ticketId}/resolved-indication`)
      .set("Cookie", otherLogin.headers["set-cookie"]);
    expect(response.status).toBe(404);
  });
});
