import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let staffCookie: string[];
let requesterCookie: string[];
let categoryId: number;

beforeAll(async () => {
  const staffLogin = await request(app).post("/api/v1/auth/login").send({ email: "amy.tran@toktickit.dev", password: "DevPass123!" });
  staffCookie = staffLogin.headers["set-cookie"];
  const requesterLogin = await request(app).post("/api/v1/auth/login").send({ email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" });
  requesterCookie = requesterLogin.headers["set-cookie"];
  categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;

  for (let i = 0; i < 25; i += 1) {
    await request(app)
      .post("/api/v1/tickets")
      .set("Cookie", requesterCookie)
      .send({ summary: `Staff queue fixture ${i}`, description: "Used to exercise pagination.", categoryId, requestedPriority: "LOW" });
  }
});

describe("GET /api/v1/staff/tickets", () => {
  it("AC-14: returns a stable page across repeated calls, ordered by the default sort", async () => {
    const page1a = await request(app).get("/api/v1/staff/tickets?page=1&pageSize=10").set("Cookie", staffCookie);
    const page1b = await request(app).get("/api/v1/staff/tickets?page=1&pageSize=10").set("Cookie", staffCookie);
    expect(page1a.status).toBe(200);
    expect(page1a.body.data.map((t: { id: string }) => t.id)).toEqual(page1b.body.data.map((t: { id: string }) => t.id));
    expect(page1a.body.meta.pageSize).toBe(10);
  });

  it("BR-25: an out-of-range page/pageSize/sort falls back to the default instead of erroring", async () => {
    const response = await request(app).get("/api/v1/staff/tickets?page=-1&pageSize=999&sort=nope").set("Cookie", staffCookie);
    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.pageSize).toBe(20);
  });

  it("403 for a Requester", async () => {
    const response = await request(app).get("/api/v1/staff/tickets").set("Cookie", requesterCookie);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN_ROLE");
  });

  it("401 without a session", async () => {
    const response = await request(app).get("/api/v1/staff/tickets");
    expect(response.status).toBe(401);
  });

  it("search filters by ticket number or summary across all requesters' tickets", async () => {
    const response = await request(app).get("/api/v1/staff/tickets?search=fixture%2024").set("Cookie", staffCookie);
    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/v1/staff/assignable-owners", () => {
  it("returns only active IT Staff and Administrator users", async () => {
    const response = await request(app).get("/api/v1/staff/assignable-owners").set("Cookie", staffCookie);
    expect(response.status).toBe(200);
    expect(response.body.every((u: { role: string }) => ["IT_STAFF", "ADMINISTRATOR"].includes(u.role))).toBe(true);
    expect(response.body.some((u: { displayName: string }) => u.displayName === "Former Technician")).toBe(false);
  });

  it("403 for a Requester", async () => {
    const response = await request(app).get("/api/v1/staff/assignable-owners").set("Cookie", requesterCookie);
    expect(response.status).toBe(403);
  });
});
