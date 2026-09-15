import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "../../src/services/password";

describe("password service", () => {
  it("hashes a password and verifies the correct plaintext against it", async () => {
    const hash = await hashPassword("DevPass123!");
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
    await expect(verifyPassword("DevPass123!", hash)).resolves.toBe(true);
  });

  it("rejects the wrong plaintext against a hash", async () => {
    const hash = await hashPassword("DevPass123!");
    await expect(verifyPassword("WrongPass123!", hash)).resolves.toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    const errors = validatePasswordPolicy("Ab1!");
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a password missing an uppercase, lowercase, digit, or special character", () => {
    expect(validatePasswordPolicy("alllowercase1!").length).toBeGreaterThan(0);
    expect(validatePasswordPolicy("ALLUPPERCASE1!").length).toBeGreaterThan(0);
    expect(validatePasswordPolicy("NoDigitsHere!").length).toBeGreaterThan(0);
    expect(validatePasswordPolicy("NoSpecial123").length).toBeGreaterThan(0);
  });

  it("accepts a password satisfying every policy rule", () => {
    expect(validatePasswordPolicy("DevPass123!")).toEqual([]);
  });
});
