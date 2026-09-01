import { describe, it, expect, afterEach } from "vitest";
import { formatTicketNumber, generateTicketNumber } from "../../src/services/ticketNumber";
import { prisma } from "../../src/prisma";

describe("formatTicketNumber", () => {
  it("pads single-digit sequence numbers to six digits", () => {
    expect(formatTicketNumber(2026, 1)).toBe("TKT-2026-000001");
  });

  it("formats a mid-range sequence number correctly", () => {
    expect(formatTicketNumber(2026, 42)).toBe("TKT-2026-000042");
  });
});

describe("generateTicketNumber", () => {
  afterEach(async () => {
    await prisma.ticketCounter.deleteMany({ where: { year: { in: [2098, 2099] } } });
  });

  it("starts a new year at 1", async () => {
    const result = await prisma.$transaction((tx) => generateTicketNumber(tx, 2099));
    expect(result).toBe("TKT-2099-000001");
  });

  it("increments on the second call for the same year", async () => {
    await prisma.$transaction((tx) => generateTicketNumber(tx, 2099));
    const second = await prisma.$transaction((tx) => generateTicketNumber(tx, 2099));
    expect(second).toBe("TKT-2099-000002");
  });

  it("produces 10 distinct, gapless numbers under concurrent calls", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => prisma.$transaction((tx) => generateTicketNumber(tx, 2098))),
    );
    const sequenceNumbers = results
      .map((ticketNumber) => Number(ticketNumber.split("-")[2]))
      .sort((a, b) => a - b);
    expect(new Set(sequenceNumbers).size).toBe(10);
    expect(sequenceNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
