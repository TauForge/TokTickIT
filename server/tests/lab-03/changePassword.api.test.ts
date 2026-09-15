import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app";

async function loginOnboarding() {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "onboarding@toktickit.local", password: "DevPass123!" });
  return response.headers["set-cookie"];
}

describe("mustChangePassword gate", () => {
  it("blocks a protected route other than /me, /auth/logout, /auth/change-password", async () => {
    const cookie = await loginOnboarding();
    const response = await request(app).get("/api/v1/tickets").set("Cookie", cookie);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
  });

  it("still allows /me and /auth/logout while mustChangePassword is true", async () => {
    const cookie = await loginOnboarding();
    const me = await request(app).get("/api/v1/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.mustChangePassword).toBe(true);
  });

  it("clears mustChangePassword on a valid change-password call, unblocking other routes", async () => {
    const cookie = await loginOnboarding();
    const change = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: "DevPass123!", newPassword: "NewOnboard456!" });
    expect(change.status).toBe(200);
    expect(change.body.mustChangePassword).toBe(false);

    // onboarding@toktickit.local is IT_STAFF, so /api/v1/tickets (REQUESTER-only) still
    // rejects it post-unblock — but the rejection reason must switch from the password
    // gate to the role gate, proving mustChangePassword no longer short-circuits the chain.
    const afterChange = await request(app).get("/api/v1/tickets").set("Cookie", cookie);
    expect(afterChange.status).toBe(403);
    expect(afterChange.body.error.code).toBe("FORBIDDEN_ROLE");

    // Restore the fixture's password and flag so this test is re-runnable against the
    // shared test database.
    await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: "NewOnboard456!", newPassword: "DevPass123!" });
    const { prisma } = await import("../../src/prisma");
    await prisma.user.update({ where: { email: "onboarding@toktickit.local" }, data: { mustChangePassword: true } });
  });

  it("rejects a wrong current password with 422 INVALID_CURRENT_PASSWORD", async () => {
    const cookie = await loginOnboarding();
    const response = await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: "WrongOne123!", newPassword: "NewOnboard456!" });
    expect(response.status).toBe(422);
  });
});
