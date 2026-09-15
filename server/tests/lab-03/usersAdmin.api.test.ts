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
  // The create tests leave rows behind; delete them so this file is re-runnable
  // against the shared test database.
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "new.hire@toktickit.dev",
          "weak.pw@toktickit.dev",
          "edit.target@toktickit.dev",
          "second.admin@toktickit.dev",
          "third.admin@toktickit.dev",
          "reset.target@toktickit.dev",
        ],
      },
    },
  });
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

describe("PATCH /api/v1/admin/users/:id", () => {
  it("edits name/email/role/activation", async () => {
    const created = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send({ displayName: "Edit Target", email: "edit.target@toktickit.dev", role: "IT_STAFF", isActive: true, password: "Initial123!" });

    const response = await request(app)
      .patch(`/api/v1/admin/users/${created.body.id}`)
      .set("Cookie", adminCookie)
      .send({ displayName: "Edit Target Updated", email: "edit.target@toktickit.dev", role: "IT_STAFF", isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.displayName).toBe("Edit Target Updated");
    expect(response.body.isActive).toBe(false);
  });

  it("AC-16/BR-29: an Administrator cannot deactivate their own account", async () => {
    const me = await request(app).get("/api/v1/me").set("Cookie", adminCookie);
    const response = await request(app)
      .patch(`/api/v1/admin/users/${me.body.id}`)
      .set("Cookie", adminCookie)
      .send({ displayName: me.body.displayName, email: me.body.email, role: "ADMINISTRATOR", isActive: false });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("SELF_DEACTIVATION_BLOCKED");
  });

  it("AC-16/BR-30: deactivating the last active Administrator is rejected", async () => {
    const second = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send({ displayName: "Second Admin", email: "second.admin@toktickit.dev", role: "ADMINISTRATOR", isActive: true, password: "Initial123!" });

    // The original admin@toktickit.dev deactivates the newly created second admin first —
    // now only one active Administrator remains (admin@toktickit.dev itself).
    await request(app)
      .patch(`/api/v1/admin/users/${second.body.id}`)
      .set("Cookie", adminCookie)
      .send({ displayName: "Second Admin", email: "second.admin@toktickit.dev", role: "ADMINISTRATOR", isActive: false });

    // Assert directly that deactivating the *remaining* sole active admin is blocked,
    // using a third freshly-created admin account acting as the operator on the
    // original. This block briefly deactivates the shared admin@toktickit.dev seed
    // fixture that every other test file's beforeAll logs in as — the try/finally
    // guarantees it is always restored to active before this test returns, even if an
    // assertion above throws, so a failure here can never leak a deactivated admin
    // account into unrelated test files sharing this reset-once-per-run database.
    const third = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send({ displayName: "Third Admin", email: "third.admin@toktickit.dev", role: "ADMINISTRATOR", isActive: true, password: "Initial123!" });
    const meAdmin = await request(app).get("/api/v1/me").set("Cookie", adminCookie);
    const thirdLogin = await request(app).post("/api/v1/auth/login").send({ email: "third.admin@toktickit.dev", password: "Initial123!" });
    // Admin-created accounts start with mustChangePassword=true, which blockIfPasswordChangeRequired
    // (part of adminGate) would otherwise reject with 403 PASSWORD_CHANGE_REQUIRED before the role
    // check ever runs — clear it first so the third admin's session can actually exercise adminGate.
    await request(app)
      .post("/api/v1/auth/change-password")
      .set("Cookie", thirdLogin.headers["set-cookie"])
      .send({ currentPassword: "Initial123!", newPassword: "ThirdAdmin789!" });

    try {
      // Deactivate admin@toktickit.dev via the third admin's session — third+admin@ are
      // both active right now, so this individual call is allowed...
      const deactivateOriginal = await request(app)
        .patch(`/api/v1/admin/users/${meAdmin.body.id}`)
        .set("Cookie", thirdLogin.headers["set-cookie"])
        .send({ displayName: meAdmin.body.displayName, email: meAdmin.body.email, role: "ADMINISTRATOR", isActive: false });
      expect(deactivateOriginal.status).toBe(200);

      // ...now only "Third Admin" is active, and it would be deactivating *itself*.
      // BR-29 (self-deactivation, unconditional) is checked before BR-30 (last-admin
      // count) — see the earlier "cannot deactivate own account" test in this file,
      // which asserts the same precedence for the single-admin case.
      const lastAttempt = await request(app)
        .patch(`/api/v1/admin/users/${third.body.id}`)
        .set("Cookie", thirdLogin.headers["set-cookie"])
        .send({ displayName: "Third Admin", email: "third.admin@toktickit.dev", role: "ADMINISTRATOR", isActive: false });
      expect(lastAttempt.status).toBe(409);
      expect(lastAttempt.body.error.code).toBe("SELF_DEACTIVATION_BLOCKED");

      // Genuine BR-30 coverage without the BR-29 overlap: changing the sole active
      // admin's *role* away from ADMINISTRATOR (still active, not a deactivation) hits
      // the wouldLeaveNoAdmin check directly, since BR-29 only guards deactivation.
      const roleChangeAttempt = await request(app)
        .patch(`/api/v1/admin/users/${third.body.id}`)
        .set("Cookie", thirdLogin.headers["set-cookie"])
        .send({ displayName: "Third Admin", email: "third.admin@toktickit.dev", role: "IT_STAFF", isActive: true });
      expect(roleChangeAttempt.status).toBe(409);
      expect(roleChangeAttempt.body.error.code).toBe("LAST_ADMIN_PROTECTED");
    } finally {
      // Restore admin@toktickit.dev to active unconditionally — runs whether the
      // assertions above passed or threw.
      await request(app)
        .patch(`/api/v1/admin/users/${meAdmin.body.id}`)
        .set("Cookie", thirdLogin.headers["set-cookie"])
        .send({ displayName: meAdmin.body.displayName, email: meAdmin.body.email, role: "ADMINISTRATOR", isActive: true });
    }
  });

  it("AC-15/BR-12: editing to a duplicate email returns 409 EMAIL_ALREADY_EXISTS", async () => {
    const response = await request(app)
      .patch(`/api/v1/admin/users/1`)
      .set("Cookie", adminCookie)
      .send({ displayName: "Whoever", email: "amy.tran@toktickit.dev", role: "REQUESTER", isActive: true });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });
});

describe("PATCH /api/v1/admin/users/:id/password", () => {
  it("AC-17/FR-22: sets a new password that forces mustChangePassword at next login", async () => {
    const created = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", adminCookie)
      .send({ displayName: "Reset Target", email: "reset.target@toktickit.dev", role: "IT_STAFF", isActive: true, password: "Initial123!" });

    const reset = await request(app)
      .patch(`/api/v1/admin/users/${created.body.id}/password`)
      .set("Cookie", adminCookie)
      .send({ password: "BrandNew456!" });
    expect(reset.status).toBe(200);
    expect(reset.body.mustChangePassword).toBe(true);

    const login = await request(app).post("/api/v1/auth/login").send({ email: "reset.target@toktickit.dev", password: "BrandNew456!" });
    expect(login.status).toBe(200);
    expect(login.body.user.mustChangePassword).toBe(true);
  });

  it("422 when the new password fails policy", async () => {
    const response = await request(app).patch(`/api/v1/admin/users/1/password`).set("Cookie", adminCookie).send({ password: "weak" });
    expect(response.status).toBe(422);
  });
});
