import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let requesterId: number;
let cookie: string[];
let attachmentId: string;

const cookieCache = new Map<number, string[]>();
async function cookieFor(userId: number): Promise<string[]> {
  if (!cookieCache.has(userId)) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const login = await request(app).post("/api/v1/auth/login").send({ email: user.email, password: "DevPass123!" });
    cookieCache.set(userId, login.headers["set-cookie"]);
  }
  return cookieCache.get(userId)!;
}

beforeAll(async () => {
  requesterId = (await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true } }))!.id;
  cookie = await cookieFor(requesterId);
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const ticket = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", cookie)
    .send({ summary: "DOWNLOAD-TEST", description: "Used to test attachment download.", categoryId, requestedPriority: "LOW" });
  const attachment = await request(app)
    .post(`/api/v1/tickets/${ticket.body.id}/attachments`)
    .set("Cookie", cookie)
    .attach("file", Buffer.from("hello"), { filename: "note.png", contentType: "image/png" });
  attachmentId = attachment.body.id;
});

describe("GET /api/v1/attachments/:id/download", () => {
  it("streams the file for an active attachment owned by the requester", async () => {
    const response = await request(app)
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("Cookie", cookie);

    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("hello");
  });

  it("returns 404 for a different requester", async () => {
    const other = await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true, id: { not: requesterId } } });
    const response = await request(app)
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("Cookie", await cookieFor(other!.id));

    expect(response.status).toBe(404);
  });
});
