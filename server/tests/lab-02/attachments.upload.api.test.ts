import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/prisma";

let requesterId: number;
let ticketId: string;

beforeAll(async () => {
  requesterId = (await prisma.requester.findFirst({ where: { isActive: true } }))!.id;
  const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
  const created = await request(app)
    .post("/api/tickets")
    .set("x-dev-requester-id", String(requesterId))
    .send({
      summary: "ATTACH-TEST ticket",
      description: "Used to test attachment upload rules.",
      categoryId,
      requestedPriority: "LOW",
    });
  ticketId = created.body.id;
});

describe("POST /api/tickets/:id/attachments", () => {
  it("uploads a valid JPG under 5MB", async () => {
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-dev-requester-id", String(requesterId))
      .attach("file", Buffer.from("fake-jpg-bytes"), { filename: "screenshot.jpg", contentType: "image/jpeg" });

    expect(response.status).toBe(201);
    expect(response.body.filename).toBe("screenshot.jpg");
    expect(response.body.isRemoved).toBe(false);
  });

  it("rejects an unsupported file type with 415", async () => {
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-dev-requester-id", String(requesterId))
      .attach("file", Buffer.from("not an image"), { filename: "virus.exe", contentType: "application/x-msdownload" });

    expect(response.status).toBe(415);
  });

  it("rejects a file over 5MB with 413", async () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-dev-requester-id", String(requesterId))
      .attach("file", oversized, { filename: "big.png", contentType: "image/png" });

    expect(response.status).toBe(413);
  });

  it("rejects a file whose extension doesn't match an allowed type, even with a spoofed MIME type", async () => {
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-dev-requester-id", String(requesterId))
      .attach("file", Buffer.from("not actually a png"), { filename: "virus.exe", contentType: "image/png" });

    expect(response.status).toBe(415);
  });

  it("rejects a 10MB file with 413, not 500 (well above multer's own limit, not just 1 byte over)", async () => {
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-dev-requester-id", String(requesterId))
      .attach("file", Buffer.alloc(10 * 1024 * 1024), { filename: "huge.png", contentType: "image/png" });

    expect(response.status).toBe(413);
  });

  it("returns 409 on the 6th active attachment for a fresh ticket, uploaded independently of other tests", async () => {
    const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
    const freshTicket = await request(app)
      .post("/api/tickets")
      .set("x-dev-requester-id", String(requesterId))
      .send({ summary: "CAP-TEST ticket", description: "Used only to test the 5-attachment cap.", categoryId, requestedPriority: "LOW" });
    const freshTicketId = freshTicket.body.id;

    for (let i = 0; i < 5; i += 1) {
      const uploadResponse = await request(app)
        .post(`/api/tickets/${freshTicketId}/attachments`)
        .set("x-dev-requester-id", String(requesterId))
        .attach("file", Buffer.from("x"), { filename: `f${i}.png`, contentType: "image/png" });
      expect(uploadResponse.status).toBe(201);
    }

    const sixth = await request(app)
      .post(`/api/tickets/${freshTicketId}/attachments`)
      .set("x-dev-requester-id", String(requesterId))
      .attach("file", Buffer.from("x"), { filename: "sixth.png", contentType: "image/png" });

    expect(sixth.status).toBe(409);
  });

  it("never allows more than 5 active attachments under concurrent uploads (no TOCTOU race)", async () => {
    const categoryId = (await prisma.category.findFirst({ where: { isActive: true } }))!.id;
    const raceTicket = await request(app)
      .post("/api/tickets")
      .set("x-dev-requester-id", String(requesterId))
      .send({ summary: "RACE-TEST ticket", description: "Used only to test concurrent uploads.", categoryId, requestedPriority: "LOW" });
    const raceTicketId = raceTicket.body.id;

    const responses = await Promise.all(
      Array.from({ length: 8 }, (_unused, i) =>
        request(app)
          .post(`/api/tickets/${raceTicketId}/attachments`)
          .set("x-dev-requester-id", String(requesterId))
          .attach("file", Buffer.from("x"), { filename: `race${i}.png`, contentType: "image/png" }),
      ),
    );

    const succeeded = responses.filter((r) => r.status === 201);
    expect(succeeded).toHaveLength(5);
  });

  it("returns 404 for a ticket owned by a different requester", async () => {
    const otherRequester = await prisma.requester.findFirst({
      where: { isActive: true, id: { not: requesterId } },
    });
    const response = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("x-dev-requester-id", String(otherRequester!.id))
      .attach("file", Buffer.from("x"), { filename: "sneaky.png", contentType: "image/png" });

    expect(response.status).toBe(404);
  });
});
