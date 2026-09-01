import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { errorEnvelope, HttpError } from "../../src/middleware/errorEnvelope";

function buildTestApp() {
  const app = express();
  app.get("/boom-http", () => {
    throw new HttpError(404, "NOT_FOUND", "Thing not found");
  });
  app.get("/boom-validation", () => {
    throw new HttpError(422, "VALIDATION_FAILED", "Bad input", [
      { field: "summary", message: "summary is required" },
    ]);
  });
  app.get("/boom-unknown", () => {
    throw new Error("unexpected");
  });
  app.use(errorEnvelope);
  return app;
}

describe("errorEnvelope", () => {
  it("wraps an HttpError in the standard envelope", async () => {
    const response = await request(buildTestApp()).get("/boom-http");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.message).toBe("Thing not found");
    expect(response.body.error.fieldErrors).toEqual([]);
  });

  it("carries fieldErrors through for validation failures", async () => {
    const response = await request(buildTestApp()).get("/boom-validation");
    expect(response.status).toBe(422);
    expect(response.body.error.fieldErrors).toEqual([
      { field: "summary", message: "summary is required" },
    ]);
  });

  it("maps an unrecognized error to a 500 without leaking its message", async () => {
    const response = await request(buildTestApp()).get("/boom-unknown");
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
    expect(response.body.error.message).toBe("An unexpected error occurred");
  });
});
