import { describe, it, expect } from "vitest";
import { validateCreateTicketRequest } from "../../src/validators/createTicketRequest";

const validBody = {
  summary: "Laptop will not turn on",
  description: "Pressed the power button several times, no lights or fan noise at all.",
  categoryId: 1,
  requestedPriority: "MEDIUM",
};

describe("validateCreateTicketRequest", () => {
  it("accepts a fully valid body", () => {
    expect(validateCreateTicketRequest(validBody).ok).toBe(true);
  });

  it("rejects a 4-character summary", () => {
    const result = validateCreateTicketRequest({ ...validBody, summary: "abcd" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.field)).toContain("summary");
  });

  it("accepts a 5-character summary (lower boundary)", () => {
    expect(validateCreateTicketRequest({ ...validBody, summary: "abcde" }).ok).toBe(true);
  });

  it("accepts a 150-character summary (upper boundary)", () => {
    expect(validateCreateTicketRequest({ ...validBody, summary: "a".repeat(150) }).ok).toBe(true);
  });

  it("rejects a 151-character summary", () => {
    expect(validateCreateTicketRequest({ ...validBody, summary: "a".repeat(151) }).ok).toBe(false);
  });

  it("rejects a blank-after-trim summary", () => {
    expect(validateCreateTicketRequest({ ...validBody, summary: "     " }).ok).toBe(false);
  });

  it("rejects a 9-character description", () => {
    expect(validateCreateTicketRequest({ ...validBody, description: "a".repeat(9) }).ok).toBe(false);
  });

  it("accepts a 10-character description (lower boundary)", () => {
    expect(validateCreateTicketRequest({ ...validBody, description: "a".repeat(10) }).ok).toBe(true);
  });

  it("rejects a 5001-character description", () => {
    expect(validateCreateTicketRequest({ ...validBody, description: "a".repeat(5001) }).ok).toBe(false);
  });

  it("rejects a missing categoryId", () => {
    const { categoryId: _categoryId, ...rest } = validBody;
    const result = validateCreateTicketRequest(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.field)).toContain("categoryId");
  });

  it("rejects an invalid requestedPriority", () => {
    expect(validateCreateTicketRequest({ ...validBody, requestedPriority: "URGENT" }).ok).toBe(false);
  });

  it("accepts an optional numeric relatedSystemId", () => {
    expect(validateCreateTicketRequest({ ...validBody, relatedSystemId: 3 }).ok).toBe(true);
  });

  it("ignores an itPriority field in the body (never trusted from the client)", () => {
    const result = validateCreateTicketRequest({ ...validBody, itPriority: "HIGH" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).not.toHaveProperty("itPriority");
  });
});
