import { describe, it, expect } from "vitest";
import { validateActionCreate, validateActionPatch } from "../../src/validators/actionRequest";

const now = new Date("2026-10-31T10:00:00.000Z");
const ticketCreatedAt = new Date("2026-10-30T10:00:00.000Z");
const ctx = { ticketCreatedAt, now };
const valid = { description: "Replaced the switch", result: "Link restored" };

describe("UNIT-01: action input validator (BR-05, BR-06)", () => {
  it("accepts a minimal valid body and defaults the flag and actionAt", () => {
    const r = validateActionCreate(valid, ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.followUpRequired).toBe(false);
      expect(r.value.followUpNote).toBeNull();
      expect(r.value.actionAt).toEqual(now);
    }
  });

  it("trims and enforces description 1-2000 and result 1-1000", () => {
    expect(validateActionCreate({ ...valid, description: "   " }, ctx).ok).toBe(false);
    expect(validateActionCreate({ ...valid, description: "a".repeat(2000) }, ctx).ok).toBe(true);
    expect(validateActionCreate({ ...valid, description: "a".repeat(2001) }, ctx).ok).toBe(false);
    expect(validateActionCreate({ ...valid, result: "" }, ctx).ok).toBe(false);
    expect(validateActionCreate({ ...valid, result: "b".repeat(1000) }, ctx).ok).toBe(true);
    expect(validateActionCreate({ ...valid, result: "b".repeat(1001) }, ctx).ok).toBe(false);
  });

  it("limits attachment notes to 500", () => {
    expect(validateActionCreate({ ...valid, attachmentNotes: "n".repeat(500) }, ctx).ok).toBe(true);
    expect(validateActionCreate({ ...valid, attachmentNotes: "n".repeat(501) }, ctx).ok).toBe(false);
  });

  it("requires a follow-up note when followUpRequired is true", () => {
    const r = validateActionCreate({ ...valid, followUpRequired: true }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].field).toBe("followUpNote");
    expect(validateActionCreate({ ...valid, followUpRequired: true, followUpNote: "Call back" }, ctx).ok).toBe(true);
    expect(validateActionCreate({ ...valid, followUpRequired: true, followUpNote: "x".repeat(1001) }, ctx).ok).toBe(false);
  });

  it("rejects a follow-up note when followUpRequired is false", () => {
    const r = validateActionCreate({ ...valid, followUpRequired: false, followUpNote: "stale" }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].field).toBe("followUpNote");
  });

  it("rejects non-boolean followUpRequired and non-string fields", () => {
    expect(validateActionCreate({ ...valid, followUpRequired: "yes" }, ctx).ok).toBe(false);
    expect(validateActionCreate({ description: 5, result: {} }, ctx).ok).toBe(false);
  });

  it("applies the same rules to the merged result on PATCH", () => {
    const existing = { description: "d", result: "r", followUpRequired: true, followUpNote: "n", attachmentNotes: null, actionAt: now };
    expect(validateActionPatch({ expectedVersion: 0, followUpRequired: false }, existing, ctx).ok).toBe(false);
    expect(validateActionPatch({ expectedVersion: 0, followUpRequired: false, followUpNote: null }, existing, ctx).ok).toBe(true);
    expect(validateActionPatch({ expectedVersion: 0, result: "new" }, existing, ctx).ok).toBe(true);
  });

  it("returns VERSION_REQUIRED flag when expectedVersion is missing or not an integer", () => {
    const existing = { description: "d", result: "r", followUpRequired: false, followUpNote: null, attachmentNotes: null, actionAt: now };
    for (const body of [{}, { expectedVersion: "1" }, { expectedVersion: 1.5 }, { expectedVersion: -1 }]) {
      const r = validateActionPatch(body, existing, ctx);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.versionMissing).toBe(true);
    }
  });
});

describe("UNIT-02: action date window (BR-04)", () => {
  it("accepts now+5min and rejects later", () => {
    const edge = new Date(now.getTime() + 5 * 60_000).toISOString();
    const over = new Date(now.getTime() + 5 * 60_000 + 1000).toISOString();
    expect(validateActionCreate({ ...valid, actionAt: edge }, ctx).ok).toBe(true);
    const r = validateActionCreate({ ...valid, actionAt: over }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0].field).toBe("actionAt");
  });

  it("rejects before ticket creation and accepts exactly at creation", () => {
    expect(validateActionCreate({ ...valid, actionAt: ticketCreatedAt.toISOString() }, ctx).ok).toBe(true);
    expect(validateActionCreate({ ...valid, actionAt: new Date(ticketCreatedAt.getTime() - 1).toISOString() }, ctx).ok).toBe(false);
  });

  it("compares creation at minute precision so a form default within the creation minute is accepted", () => {
    const created = new Date("2026-10-30T10:00:45.000Z");
    const sameMinute = new Date("2026-10-30T10:00:00.000Z").toISOString();
    const previousMinute = new Date("2026-10-30T09:59:59.999Z").toISOString();
    expect(validateActionCreate({ ...valid, actionAt: sameMinute }, { ...ctx, ticketCreatedAt: created }).ok).toBe(true);
    expect(validateActionCreate({ ...valid, actionAt: previousMinute }, { ...ctx, ticketCreatedAt: created }).ok).toBe(false);
  });

  it("rejects an unparseable date", () => {
    expect(validateActionCreate({ ...valid, actionAt: "not a date" }, ctx).ok).toBe(false);
  });
});
