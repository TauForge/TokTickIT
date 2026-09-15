import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

describe("BR-27: the Lab 2 dev seam is fully removed", () => {
  it("x-dev-requester-id has no effect on a protected route — still 401 without a session", async () => {
    const requester = await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true } });
    const response = await request(app)
      .get("/api/v1/tickets")
      .set("x-dev-requester-id", String(requester!.id));
    expect(response.status).toBe(401);
  });

  it("GET /api/dev-requesters no longer exists", async () => {
    const response = await request(app).get("/api/dev-requesters");
    expect(response.status).toBe(404);
  });

  it("the old unversioned /api/tickets path no longer exists", async () => {
    const response = await request(app).get("/api/tickets");
    expect(response.status).toBe(404);
  });
});
