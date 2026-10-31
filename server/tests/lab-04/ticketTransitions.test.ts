import { describe, it, expect } from "vitest";
import { isValidTransition, TicketStatus } from "../../src/services/ticketStatusTransitions";
import { PATCH_VALID } from "./transitionMatrix";

const ALL: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];

describe("UNIT-03: status transition matrix over all 64 pairs (6.1, AC-13, AC-14)", () => {
  const pairs = ALL.flatMap((from) => ALL.map((to) => [from, to] as [TicketStatus, TicketStatus]));
  const validKeys = new Set(PATCH_VALID.map(([f, t]) => `${f}>${t}`));

  it("covers exactly 64 pairs and 16 valid ones", () => {
    expect(pairs).toHaveLength(64);
    expect(PATCH_VALID).toHaveLength(16);
  });

  it.each(pairs)("%s -> %s matches the listed set", (from, to) => {
    expect(isValidTransition(from, to)).toBe(validKeys.has(`${from}>${to}`));
  });
});
