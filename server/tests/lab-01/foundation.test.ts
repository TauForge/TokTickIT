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
