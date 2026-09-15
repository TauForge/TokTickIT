import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let adminCookie: string[];
let staffCookie: string[];

beforeAll(async () => {
  const adminLogin = await request(app).post("/api/v1/auth/login").send({ email: "admin@toktickit.dev", password: "DevPass123!" });
  adminCookie = adminLogin.headers["set-cookie"];
  const staffLogin = await request(app).post("/api/v1/auth/login").send({ email: "amy.tran@toktickit.dev", password: "DevPass123!" });
  staffCookie = staffLogin.headers["set-cookie"];
});

afterAll(async () => {
  // The create test leaves a row behind; delete it so this file is re-runnable
  // against the shared test database.
  await prisma.user.deleteMany({ where: { email: { in: ["new.hire@toktickit.dev", "weak.pw@toktickit.dev"] } } });
});

describe("GET /api/v1/admin/users", () => {
  it("lists users and supports a role filter", async () => {
    const response = await request(app).get("/api/v1/admin/users?role=ADMINISTRATOR").set("Cookie", adminCookie);
    expect(response.status).toBe(200);
    expect(response.body.every((u: { role: string }) => u.role === "ADMINISTRATOR")).toBe(true);
  });

  it("AC-18: 403 for IT Staff, no data returned", async () => {
    const response = await request(app).get("/api/v1/admin/users").set("Cookie", staffCookie);
    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty("length");
  });
});

describe("POST /api/v1/admin/users", () => {
  it("creates a user with an initial password that forces mustChangePassword", async () => {
    const response = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send({ displayName: "New Hire", email: "new.hire@toktickit.dev", role: "IT_STAFF", isActive: true, password: "Initial123!" });

    expect(response.status).toBe(201);
    expect(response.body.mustChangePassword).toBe(true);
    expect(response.body.passwordHash).toBeUndefined();
  });

  it("AC-15/BR-12: duplicate email (case-insensitive) returns 409 EMAIL_ALREADY_EXISTS", async () => {
    const response = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send({ displayName: "Duplicate", email: "AMY.TRAN@toktickit.dev", role: "IT_STAFF", isActive: true, password: "Initial123!" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("422 when the initial password fails policy", async () => {
    const response = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send({ displayName: "Weak Password", email: "weak.pw@toktickit.dev", role: "IT_STAFF", isActive: true, password: "weak" });
    expect(response.status).toBe(422);
  });
});
