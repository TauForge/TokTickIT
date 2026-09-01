import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let requesterAId: number;
let requesterBId: number;
let ownedTicketId: string;

beforeAll(async () => {
  const [a, b] = await prisma.requester.findMany({ where: { isActive: true }, take: 2 });
  requesterAId = a.id;
  requesterBId = b.id;
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;

  const created = await request(app)
    .post("/api/tickets")
    .set("x-dev-requester-id", String(requesterAId))
    .send({
      summary: "DETAIL-TEST ticket",
      description: "Used to test GET /api/tickets/:id ownership.",
      categoryId,
      requestedPriority: "LOW",
    });
  ownedTicketId = created.body.id;
});

describe("GET /api/tickets/:id", () => {
  it("returns the ticket for its owning requester", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .set("x-dev-requester-id", String(requesterAId));

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ownedTicketId);
  });

  it("returns 404 for a different requester", async () => {
    const response = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .set("x-dev-requester-id", String(requesterBId));

    expect(response.status).toBe(404);
  });

  it("returns 404 for a non-existent ticket id", async () => {
    const response = await request(app)
      .get("/api/tickets/00000000-0000-0000-0000-000000000000")
      .set("x-dev-requester-id", String(requesterAId));

    expect(response.status).toBe(404);
  });
});
