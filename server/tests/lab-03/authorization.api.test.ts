import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";

let requesterCookie: string[];
let staffCookie: string[];

beforeAll(async () => {
  const requesterLogin = await request(app).post("/api/v1/auth/login").send({ email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" });
  requesterCookie = requesterLogin.headers["set-cookie"];
  const staffLogin = await request(app).post("/api/v1/auth/login").send({ email: "amy.tran@toktickit.dev", password: "DevPass123!" });
  staffCookie = staffLogin.headers["set-cookie"];
});

const STAFF_ONLY_ROUTES = ["/api/v1/staff/tickets", "/api/v1/staff/assignable-owners"];
const ADMIN_ONLY_ROUTES = ["/api/v1/admin/users"];

describe("FR-26: unauthenticated vs. forbidden-by-role, no existence leak", () => {
  it.each(STAFF_ONLY_ROUTES)("401 without a session on %s", async (path) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(401);
  });

  it.each(ADMIN_ONLY_ROUTES)("401 without a session on %s", async (path) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(401);
  });

  it.each(STAFF_ONLY_ROUTES)("AC-18-equivalent: 403 FORBIDDEN_ROLE for a Requester on %s, no list data returned", async (path) => {
    const response = await request(app).get(path).set("Cookie", requesterCookie);
    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty("length");
    expect(Array.isArray(response.body)).toBe(false);
  });

  it.each(ADMIN_ONLY_ROUTES)("AC-18: 403 FORBIDDEN_ROLE for a Requester on %s, no user data returned", async (path) => {
    const response = await request(app).get(path).set("Cookie", requesterCookie);
    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty("length");
  });

  it.each(ADMIN_ONLY_ROUTES)("AC-18: 403 FORBIDDEN_ROLE for IT Staff on %s, no user data returned", async (path) => {
    const response = await request(app).get(path).set("Cookie", staffCookie);
    expect(response.status).toBe(403);
    expect(response.body).not.toHaveProperty("length");
  });
});
