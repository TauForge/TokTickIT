import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let cookieA: string[];
let cookieB: string[];
let ownedTicketId: string;

async function loginAs(email: string): Promise<string[]> {
  const login = await request(app).post("/api/v1/auth/login").send({ email, password: "DevPass123!" });
  return login.headers["set-cookie"];
}

beforeAll(async () => {
  const [a, b] = await prisma.user.findMany({ where: { role: "REQUESTER", isActive: true }, take: 2 });
  cookieA = await loginAs(a.email);
  cookieB = await loginAs(b.email);
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;

  const created = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", cookieA)
    .send({
      summary: "DETAIL-TEST ticket",
      description: "Used to test GET /api/v1/tickets/:id ownership.",
      categoryId,
      requestedPriority: "LOW",
    });
  ownedTicketId = created.body.id;
});

describe("GET /api/v1/tickets/:id", () => {
  it("returns the ticket for its owning requester", async () => {
    const response = await request(app)
      .get(`/api/v1/tickets/${ownedTicketId}`)
      .set("Cookie", cookieA);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ownedTicketId);
  });

  it("returns 404 for a different requester", async () => {
    const response = await request(app)
      .get(`/api/v1/tickets/${ownedTicketId}`)
      .set("Cookie", cookieB);

    expect(response.status).toBe(404);
  });

  it("returns 404 for a non-existent ticket id", async () => {
    const response = await request(app)
      .get("/api/v1/tickets/00000000-0000-0000-0000-000000000000")
      .set("Cookie", cookieA);

    expect(response.status).toBe(404);
  });
});
