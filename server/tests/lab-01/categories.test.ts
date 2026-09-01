import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("../../src/prisma", () => ({ prisma: { category: { findMany } } }));

import { app } from "../../src/app";

describe("Category list API", () => {
  it("returns active categories from Prisma in ID order", async () => {
    findMany.mockResolvedValue([
      { id: 1, name: "Account and Access", code: "ACCESS" },
      { id: 2, name: "Hardware", code: "HARDWARE" },
    ]);

    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, name: "Account and Access", code: "ACCESS" },
      { id: 2, name: "Hardware", code: "HARDWARE" },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { id: "asc" },
    });
  });
});
