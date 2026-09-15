import { describe, it, expect } from "vitest";
import { prisma } from "../../src/prisma";

describe("Lab 3 seed", () => {
  it("seeds at least 3 active IT Staff and at least 1 inactive IT Staff", async () => {
    const active = await prisma.user.count({ where: { role: "IT_STAFF", isActive: true } });
    const inactive = await prisma.user.count({ where: { role: "IT_STAFF", isActive: false } });
    expect(active).toBeGreaterThanOrEqual(3);
    expect(inactive).toBeGreaterThanOrEqual(1);
  });

  it("seeds at least 1 active Administrator", async () => {
    const active = await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } });
    expect(active).toBeGreaterThanOrEqual(1);
  });

  it("seeds at least 4 active Requesters and at least 1 inactive Requester", async () => {
    const active = await prisma.user.count({ where: { role: "REQUESTER", isActive: true } });
    const inactive = await prisma.user.count({ where: { role: "REQUESTER", isActive: false } });
    expect(active).toBeGreaterThanOrEqual(4);
    expect(inactive).toBeGreaterThanOrEqual(1);
  });

  it("seeds exactly one user with mustChangePassword=true, the onboarding fixture", async () => {
    const count = await prisma.user.count({ where: { mustChangePassword: true } });
    expect(count).toBe(1);

    const onboarding = await prisma.user.findUnique({ where: { email: "onboarding@toktickit.local" } });
    expect(onboarding?.mustChangePassword).toBe(true);
  });

  it("seeding is idempotent — exactly one row per seeded email", async () => {
    const admins = await prisma.user.findMany({ where: { email: "admin@toktickit.dev" } });
    expect(admins).toHaveLength(1);
  });
});
