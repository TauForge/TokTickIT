import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app";

describe("POST /api/v1/auth/login", () => {
  it("issues a session cookie and returns the user identity on valid credentials", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: "jennifer.anderson@toktickit.dev",
      role: "REQUESTER",
    });
    expect(response.body.user.passwordHash).toBeUndefined();
    const cookie = response.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toContain("ttk_session=");
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it("returns 401 INVALID_CREDENTIALS with an identical message for unknown email or wrong password", async () => {
    const unknown = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@toktickit.dev", password: "DevPass123!" });
    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "jennifer.anderson@toktickit.dev", password: "WrongPass123!" });

    expect(unknown.status).toBe(401);
    expect(unknown.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknown.body.error.message);
  });

  it("returns 403 ACCOUNT_DEACTIVATED and sets no cookie for an inactive user's valid password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "retired.alumnus@toktickit.dev", password: "DevPass123!" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_DEACTIVATED");
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});

describe("GET /api/v1/me", () => {
  it("returns 401 without a session cookie", async () => {
    const response = await request(app).get("/api/v1/me");
    expect(response.status).toBe(401);
  });

  it("returns the current identity for a valid session cookie", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" });
    const cookie = login.headers["set-cookie"];

    const response = await request(app).get("/api/v1/me").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body.email).toBe("jennifer.anderson@toktickit.dev");
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("revokes the session so the same cookie is rejected on the next request", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "jennifer.anderson@toktickit.dev", password: "DevPass123!" });
    const cookie = login.headers["set-cookie"];

    const logout = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
    expect(logout.status).toBe(200);

    const after = await request(app).get("/api/v1/me").set("Cookie", cookie);
    expect(after.status).toBe(401);
  });
});
