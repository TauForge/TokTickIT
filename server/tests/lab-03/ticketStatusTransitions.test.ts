// server/tests/lab-03/ticketStatusTransitions.test.ts
import { describe, it, expect } from "vitest";
import { isValidTransition, isTerminal, TicketStatus } from "../../src/services/ticketStatusTransitions";

// specification.md §9 — 14 rows total. NEW->OPEN and REOPENED->OPEN are automatic (triggered
// by ownership assignment, BR-15) and are NEVER a direct PATCH target, so they are asserted
// false here even though they are valid transitions of the state machine as a whole.
const CLIENT_REQUESTABLE_VALID: [TicketStatus, TicketStatus][] = [
  ["NEW", "CANCELLED"],
  ["OPEN", "IN_PROGRESS"],
  ["OPEN", "WAITING_FOR_REQUESTER"],
  ["OPEN", "CANCELLED"],
  ["IN_PROGRESS", "WAITING_FOR_REQUESTER"],
  ["IN_PROGRESS", "RESOLVED"],
  ["WAITING_FOR_REQUESTER", "IN_PROGRESS"],
  ["WAITING_FOR_REQUESTER", "RESOLVED"],
  ["WAITING_FOR_REQUESTER", "CANCELLED"],
  ["RESOLVED", "CLOSED"],
  ["RESOLVED", "REOPENED"],
  ["CLOSED", "REOPENED"],
];

const AUTOMATIC_ONLY: [TicketStatus, TicketStatus][] = [
  ["NEW", "OPEN"],
  ["REOPENED", "OPEN"],
];

const INVALID_SAMPLES: [TicketStatus, TicketStatus][] = [
  ["NEW", "RESOLVED"],
  ["OPEN", "CLOSED"],
  ["CLOSED", "OPEN"],
  ["CLOSED", "IN_PROGRESS"],
  ["CANCELLED", "OPEN"],
  ["CANCELLED", "REOPENED"],
];

describe("ticket status transition matrix", () => {
  it.each(CLIENT_REQUESTABLE_VALID)("allows %s -> %s via direct PATCH", (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  it.each(AUTOMATIC_ONLY)("rejects %s -> %s as a direct PATCH (automatic-only)", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });

  it.each(INVALID_SAMPLES)("rejects %s -> %s", (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });

  it("CLOSED and CANCELLED are terminal; every other status is not", () => {
    expect(isTerminal("CLOSED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("OPEN")).toBe(false);
    expect(isTerminal("REOPENED")).toBe(false);
  });
});
