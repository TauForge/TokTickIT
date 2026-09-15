import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let cookie: string[];
let attachmentId: string;

beforeAll(async () => {
  const requester = await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true } });
  const login = await request(app).post("/api/v1/auth/login").send({ email: requester!.email, password: "DevPass123!" });
  cookie = login.headers["set-cookie"];

  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const ticket = await request(app)
    .post("/api/v1/tickets")
    .set("Cookie", cookie)
    .send({ summary: "REMOVE-TEST", description: "Used to test attachment soft-removal.", categoryId, requestedPriority: "LOW" });
  const attachment = await request(app)
    .post(`/api/v1/tickets/${ticket.body.id}/attachments`)
    .set("Cookie", cookie)
    .attach("file", Buffer.from("bye"), { filename: "remove-me.png", contentType: "image/png" });
  attachmentId = attachment.body.id;
});

describe("DELETE /api/v1/attachments/:id", () => {
  it("requires a non-empty reason", async () => {
    const response = await request(app)
      .delete(`/api/v1/attachments/${attachmentId}`)
      .set("Cookie", cookie)
      .send({ reason: "" });

    expect(response.status).toBe(400);
  });

  it("soft-removes with a reason, keeps metadata, disables download", async () => {
    const response = await request(app)
      .delete(`/api/v1/attachments/${attachmentId}`)
      .set("Cookie", cookie)
      .send({ reason: "Uploaded the wrong screenshot" });

    expect(response.status).toBe(200);
    expect(response.body.isRemoved).toBe(true);
    expect(response.body.removedReason).toBe("Uploaded the wrong screenshot");
    expect(response.body.downloadUrl).toBeNull();

    const download = await request(app)
      .get(`/api/v1/attachments/${attachmentId}/download`)
      .set("Cookie", cookie);
    expect(download.status).toBe(404);
  });
});
