import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let requesterAId: number;
let requesterBId: number;
let categoryId: number;

beforeAll(async () => {
  const [a, b] = await prisma.requester.findMany({ where: { isActive: true }, take: 2 });
  requesterAId = a.id;
  requesterBId = b.id;
  categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;

  await prisma.ticket.deleteMany({ where: { summary: { startsWith: "LIST-TEST" } } });
  for (let i = 0; i < 12; i += 1) {
    await request(app)
      .post("/api/tickets")
      .set("x-dev-requester-id", String(requesterAId))
      .send({
        summary: `LIST-TEST ${i}`,
        description: "Seed ticket for the my-tickets list test.",
        categoryId,
        requestedPriority: "LOW",
      });
  }
  await request(app)
    .post("/api/tickets")
    .set("x-dev-requester-id", String(requesterBId))
    .send({
      summary: "LIST-TEST other requester",
      description: "Belongs to requester B only.",
      categoryId,
      requestedPriority: "LOW",
    });
});

describe("GET /api/tickets", () => {
  it("returns only the requesting requester's tickets, paginated at the default page size", async () => {
    const response = await request(app).get("/api/tickets").set("x-dev-requester-id", String(requesterAId));

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeLessThanOrEqual(10);
    expect(response.body.pageSize).toBe(10);
    expect(response.body.totalItems).toBeGreaterThanOrEqual(12);
    for (const ticket of response.body.items) {
      expect(ticket.requesterId).toBe(requesterAId);
    }
  });

  it("falls back to defaults for an invalid pageSize", async () => {
    const response = await request(app)
      .get("/api/tickets?pageSize=9999")
      .set("x-dev-requester-id", String(requesterAId));

    expect(response.status).toBe(200);
    expect(response.body.pageSize).toBe(10);
  });

  it("filters by search matching the summary", async () => {
    const response = await request(app)
      .get("/api/tickets?search=LIST-TEST 3")
      .set("x-dev-requester-id", String(requesterAId));

    expect(response.status).toBe(200);
    expect(response.body.items.some((t: { summary: string }) => t.summary.includes("LIST-TEST 3"))).toBe(true);
  });

  it("returns an empty items array with totalItems 0 for a requester with no tickets", async () => {
    const empty = await prisma.requester.create({
      data: { name: "Empty Test", email: `empty-${Date.now()}@toktickit.dev`, isActive: true },
    });
    const response = await request(app).get("/api/tickets").set("x-dev-requester-id", String(empty.id));

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.totalItems).toBe(0);
  });
});
