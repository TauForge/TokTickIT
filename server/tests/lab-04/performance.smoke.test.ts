import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

// PERF-01: both dashboards respond under 500 ms against the seed plus 2,000 bulk-created Tickets (BR-22).
const PASSWORD = "DevPass123!";
const BULK = 2000;
const LIMIT_MS = 500;
const PREFIX = `PERF-${Date.now()}-`;
const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

async function login(email: string): Promise<string[]> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password: PASSWORD });
  return res.headers["set-cookie"] as unknown as string[];
}

let requester: string[];
let staff: string[];
let admin: string[];

beforeAll(async () => {
  [requester, staff, admin] = await Promise.all([login("jennifer.anderson@toktickit.dev"), login("amy.tran@toktickit.dev"), login("admin@toktickit.dev")]);
  const jen = await prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@toktickit.dev" } });
  const amy = await prisma.user.findUniqueOrThrow({ where: { email: "amy.tran@toktickit.dev" } });
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  await prisma.ticket.createMany({
    data: Array.from({ length: BULK }, (_, i) => ({
      ticketNumber: `${PREFIX}${i}`,
      summary: `Performance fixture ${i}`,
      description: "bulk",
      status: STATUSES[i % STATUSES.length],
      requestedPriority: "LOW" as const,
      itPriority: PRIORITIES[i % PRIORITIES.length],
      requesterId: jen.id,
      categoryId,
      ownerId: i % 3 === 0 ? amy.id : null,
    })),
  });
}, 60_000);

afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { ticketNumber: { startsWith: PREFIX } } });
});

async function timed(path: string, cookie: string[]) {
  const start = performance.now();
  const res = await request(app).get(path).set("Cookie", cookie);
  return { res, ms: performance.now() - start };
}

describe("PERF-01: dashboards on seed plus 2,000 Tickets", () => {
  it.each([
    ["requester", "/api/v1/dashboard/requester", () => requester],
    ["staff", "/api/v1/dashboard/staff", () => staff],
    ["administrator", "/api/v1/dashboard/staff", () => admin],
  ])("%s dashboard responds in under 500 ms", async (_name, path, who) => {
    await timed(path, who()); // warm the connection and query plan
    const { res, ms } = await timed(path, who());
    expect(res.status).toBe(200);
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});
