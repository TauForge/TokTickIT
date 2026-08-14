import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app";

describe("Express foundation", () => {
  it("starts and responds to the foundation route", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.service).toBe("TokTickIT API");
  });
});

describe("API health check", () => {
  it("returns an OK status for the TokTickIT API", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "TokTickIT API",
    });
  });
});
