import { describe, it, expect } from "vitest";
import { prisma } from "../../src/prisma";

describe("Lab 2 migration and seed", () => {
  it("preserves the four Lab 1 categories with code and isActive backfilled", async () => {
    const categories = await prisma.category.findMany({ orderBy: { id: "asc" } });

    expect(categories).toHaveLength(4);
    expect(categories.map((c) => c.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
    expect(categories.map((c) => c.code)).toEqual([
      "ACCESS",
      "HARDWARE",
      "SOFTWARE",
      "NETWORK",
    ]);
    for (const category of categories) {
      expect(category.isActive).toBe(true);
    }
  });

  it("seeds at least six related systems, with at least one inactive", async () => {
    const active = await prisma.relatedSystem.count({ where: { isActive: true } });
    const inactive = await prisma.relatedSystem.count({ where: { isActive: false } });

    expect(active).toBeGreaterThanOrEqual(6);
    expect(inactive).toBeGreaterThanOrEqual(1);
  });

  it("seeds at least four active dev requesters and at least one inactive", async () => {
    const active = await prisma.requester.count({ where: { isActive: true } });
    const inactive = await prisma.requester.count({ where: { isActive: false } });

    expect(active).toBeGreaterThanOrEqual(4);
    expect(inactive).toBeGreaterThanOrEqual(1);
  });

  it("creates the TicketCounter table and it is queryable", async () => {
    // Does NOT assert count === 0: Task 14 onward, every ticket creation writes a
    // TicketCounter row for the current year in this shared test database, so a
    // zero-row assertion here would be permanently false the moment Task 14 lands.
    // findMany() resolving at all is proof the table/columns exist post-migration.
    await expect(prisma.ticketCounter.findMany()).resolves.toBeInstanceOf(Array);
  });
});
