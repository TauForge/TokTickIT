import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let requesterId: number;
let attachmentId: string;

beforeAll(async () => {
  requesterId = (await prisma.requester.findFirst({ where: { isActive: true } }))!.id;
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const ticket = await request(app)
    .post("/api/tickets")
    .set("x-dev-requester-id", String(requesterId))
    .send({ summary: "DOWNLOAD-TEST", description: "Used to test attachment download.", categoryId, requestedPriority: "LOW" });
  const attachment = await request(app)
    .post(`/api/tickets/${ticket.body.id}/attachments`)
    .set("x-dev-requester-id", String(requesterId))
    .attach("file", Buffer.from("hello"), { filename: "note.png", contentType: "image/png" });
  attachmentId = attachment.body.id;
});

describe("GET /api/attachments/:id/download", () => {
  it("streams the file for an active attachment owned by the requester", async () => {
    const response = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("x-dev-requester-id", String(requesterId));

    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("hello");
  });

  it("returns 404 for a different requester", async () => {
    const other = await prisma.requester.findFirst({ where: { isActive: true, id: { not: requesterId } } });
    const response = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("x-dev-requester-id", String(other!.id));

    expect(response.status).toBe(404);
  });
});
