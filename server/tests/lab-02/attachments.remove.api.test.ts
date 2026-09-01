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
    .send({ summary: "REMOVE-TEST", description: "Used to test attachment soft-removal.", categoryId, requestedPriority: "LOW" });
  const attachment = await request(app)
    .post(`/api/tickets/${ticket.body.id}/attachments`)
    .set("x-dev-requester-id", String(requesterId))
    .attach("file", Buffer.from("bye"), { filename: "remove-me.png", contentType: "image/png" });
  attachmentId = attachment.body.id;
});

describe("DELETE /api/attachments/:id", () => {
  it("requires a non-empty reason", async () => {
    const response = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("x-dev-requester-id", String(requesterId))
      .send({ reason: "" });

    expect(response.status).toBe(400);
  });

  it("soft-removes with a reason, keeps metadata, disables download", async () => {
    const response = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("x-dev-requester-id", String(requesterId))
      .send({ reason: "Uploaded the wrong screenshot" });

    expect(response.status).toBe(200);
    expect(response.body.isRemoved).toBe(true);
    expect(response.body.removedReason).toBe("Uploaded the wrong screenshot");
    expect(response.body.downloadUrl).toBeNull();

    const download = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("x-dev-requester-id", String(requesterId));
    expect(download.status).toBe(404);
  });
});
