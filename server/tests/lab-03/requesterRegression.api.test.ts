import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let cookieA: string[];
let cookieB: string[];
let categoryId: number;

async function loginAs(email: string): Promise<string[]> {
  const response = await request(app).post("/api/v1/auth/login").send({ email, password: "DevPass123!" });
  return response.headers["set-cookie"];
}

beforeAll(async () => {
  cookieA = await loginAs("jennifer.anderson@toktickit.dev");
  cookieB = await loginAs("michael.brown@toktickit.dev");
  categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
});

describe("Requester ticket/attachment regression under session auth", () => {
  it("AC-03/BR-03: an authenticated Requester's supplied requesterId is ignored — ownership comes from the session", async () => {
    const otherRequester = await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true, email: { not: "jennifer.anderson@toktickit.dev" } } });

    const response = await request(app)
      .post("/api/v1/tickets")
      .set("Cookie", cookieA)
      .send({
        summary: "Regression: requesterId spoof attempt",
        description: "Body includes a foreign requesterId that must be ignored.",
        categoryId,
        requestedPriority: "LOW",
        requesterId: otherRequester!.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.requesterId).not.toBe(otherRequester!.id);

    const asOwner = await request(app).get(`/api/v1/tickets/${response.body.id}`).set("Cookie", cookieA);
    expect(asOwner.status).toBe(200);
  });

  it("AC-09 (Lab 2 BR-18 carried forward): a Requester requesting another Requester's ticket gets 404, not 403", async () => {
    const created = await request(app)
      .post("/api/v1/tickets")
      .set("Cookie", cookieA)
      .send({ summary: "Regression: cross-owner access", description: "Only A should be able to read this.", categoryId, requestedPriority: "LOW" });

    const asOther = await request(app).get(`/api/v1/tickets/${created.body.id}`).set("Cookie", cookieB);
    expect(asOther.status).toBe(404);
  });

  it("still requires authentication — no cookie is rejected", async () => {
    const response = await request(app).get("/api/v1/tickets");
    expect(response.status).toBe(401);
  });

  it("uploads and downloads an attachment through the session-authenticated route", async () => {
    const ticket = await request(app)
      .post("/api/v1/tickets")
      .set("Cookie", cookieA)
      .send({ summary: "Regression: attachment round trip", description: "Upload then download.", categoryId, requestedPriority: "LOW" });

    const upload = await request(app)
      .post(`/api/v1/tickets/${ticket.body.id}/attachments`)
      .set("Cookie", cookieA)
      .attach("file", Buffer.from("hello"), { filename: "note.png", contentType: "image/png" });
    expect(upload.status).toBe(201);

    const download = await request(app).get(`/api/v1/attachments/${upload.body.id}/download`).set("Cookie", cookieA);
    expect(download.status).toBe(200);
    expect(download.body.toString()).toBe("hello");
  });
});
