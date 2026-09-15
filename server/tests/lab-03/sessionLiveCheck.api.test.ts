import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

describe("BR-11: isActive is re-checked live on every request", () => {
  it("a session issued while active is rejected the moment the user is deactivated mid-session", async () => {
    const email = "david.lee@toktickit.dev";
    const login = await request(app).post("/api/v1/auth/login").send({ email, password: "DevPass123!" });
    const cookie = login.headers["set-cookie"];

    const before = await request(app).get("/api/v1/tickets").set("Cookie", cookie);
    expect(before.status).toBe(200);

    await prisma.user.update({ where: { email }, data: { isActive: false } });

    const after = await request(app).get("/api/v1/tickets").set("Cookie", cookie);
    expect(after.status).toBe(401);

    // Restore for other tests sharing this seeded user.
    await prisma.user.update({ where: { email }, data: { isActive: true } });
  });
});
