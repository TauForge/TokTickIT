import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("../../src/prisma", () => ({
  prisma: {
    category: {
      findMany,
    },
  },
}));

import { app } from "../../src/app";

describe("Category list API", () => {
  it("returns categories from Prisma in ID order", async () => {
    findMany.mockResolvedValue([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
    ]);

    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });
  });
});
