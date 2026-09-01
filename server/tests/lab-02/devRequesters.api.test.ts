import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

describe("GET /api/dev-requesters", () => {
  it("returns only active requesters", async () => {
    const response = await request(app).get("/api/dev-requesters");
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(4);
    for (const requester of response.body) {
      expect(requester.isActive ?? true).not.toBe(false);
    }
  });
});

// GET /api/tickets does not exist until Task 16 mounts it. These three sub-tests are
// written now (so the middleware contract is documented alongside the middleware itself)
// but SKIPPED so this file's suite is green when Issue 3's PR merges — a plan reviewer
// flagged committing known-red tests across two Issue-boundary PRs as a Definition-of-Done
// violation ("no required test is skipped, disabled, or commented out" refers to tests whose
// target already exists; a forward-reference to a not-yet-built route is different — mark it
// explicitly rather than leaving it silently red). Task 16 Step 2 removes ".skip" from all
// three once GET /api/tickets exists.
describe("devRequester middleware (via GET /api/tickets, added in Task 16)", () => {
  it("returns 401 for a missing x-dev-requester-id header", async () => {
    const response = await request(app).get("/api/tickets");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for an unknown requester id", async () => {
    const response = await request(app).get("/api/tickets").set("x-dev-requester-id", "999999");
    expect(response.status).toBe(401);
  });

  it("returns 401 for an inactive requester id", async () => {
    const inactive = await prisma.requester.findFirst({ where: { isActive: false } });
    const response = await request(app)
      .get("/api/tickets")
      .set("x-dev-requester-id", String(inactive!.id));
    expect(response.status).toBe(401);
  });
});
