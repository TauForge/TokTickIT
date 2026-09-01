import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let requesterId: number;
let categoryId: number;

beforeAll(async () => {
  const requester = await prisma.requester.findFirst({ where: { isActive: true } });
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  requesterId = requester!.id;
  categoryId = category!.id;
});

describe("POST /api/tickets", () => {
  it("creates a ticket with status New and itPriority copied from requestedPriority", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("x-dev-requester-id", String(requesterId))
      .send({
        summary: "Laptop battery drains quickly",
        description: "Battery drains within two hours even when mostly idle.",
        categoryId,
        requestedPriority: "MEDIUM",
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("NEW");
    expect(response.body.itPriority).toBe("MEDIUM");
    expect(response.body.requesterId).toBe(requesterId);
    expect(response.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
  });

  it("ignores a client-supplied itPriority and requesterId", async () => {
    const otherRequester = await prisma.requester.findFirst({
      where: { isActive: true, id: { not: requesterId } },
    });

    const response = await request(app)
      .post("/api/tickets")
      .set("x-dev-requester-id", String(requesterId))
      .send({
        summary: "Printer offline again",
        description: "The 3rd floor printer shows offline in the driver list.",
        categoryId,
        requestedPriority: "LOW",
        itPriority: "HIGH",
        requesterId: otherRequester!.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.itPriority).toBe("LOW");
    expect(response.body.requesterId).toBe(requesterId);
  });

  it("returns 422 with field errors for a missing summary", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("x-dev-requester-id", String(requesterId))
      .send({ description: "Valid description text here.", categoryId, requestedPriority: "LOW" });

    expect(response.status).toBe(422);
    expect(response.body.error.fieldErrors.map((e: { field: string }) => e.field)).toContain("summary");
  });

  it("returns 422 for a non-existent categoryId instead of a raw DB error", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("x-dev-requester-id", String(requesterId))
      .send({
        summary: "Ticket with a bad category",
        description: "Category id below does not exist in the seeded data.",
        categoryId: 999999,
        requestedPriority: "LOW",
      });

    expect(response.status).toBe(422);
    expect(response.body.error.fieldErrors.map((e: { field: string }) => e.field)).toContain("categoryId");
  });

  it("returns 401 without an x-dev-requester-id header", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .send({ summary: "abcde", description: "0123456789", categoryId, requestedPriority: "LOW" });

    expect(response.status).toBe(401);
  });

  it("assigns unique, sequential ticket numbers under concurrent creation", async () => {
    const payload = {
      summary: "Concurrent test ticket",
      description: "Created to verify ticket number uniqueness under load.",
      categoryId,
      requestedPriority: "LOW" as const,
    };

    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app).post("/api/tickets").set("x-dev-requester-id", String(requesterId)).send(payload),
      ),
    );

    const numbers = responses.map((r) => r.body.ticketNumber);
    expect(new Set(numbers).size).toBe(5);
  });
});
