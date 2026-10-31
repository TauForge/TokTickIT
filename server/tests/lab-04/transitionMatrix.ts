import type { TicketStatus } from "../../src/services/ticketStatusTransitions";

// specification.md 5.2 rows that a client may request. NEW->OPEN and REOPENED->OPEN are automatic
// (system) rows and are never valid as a direct PATCH target.
export const PATCH_VALID: [TicketStatus, TicketStatus][] = [
  ["NEW", "CANCELLED"],
  ["OPEN", "IN_PROGRESS"],
  ["OPEN", "WAITING_FOR_REQUESTER"],
  ["OPEN", "CANCELLED"],
  ["IN_PROGRESS", "WAITING_FOR_REQUESTER"],
  ["IN_PROGRESS", "RESOLVED"],
  ["IN_PROGRESS", "CANCELLED"],
  ["WAITING_FOR_REQUESTER", "IN_PROGRESS"],
  ["WAITING_FOR_REQUESTER", "RESOLVED"],
  ["WAITING_FOR_REQUESTER", "CANCELLED"],
  ["RESOLVED", "CLOSED"],
  ["RESOLVED", "REOPENED"],
  ["CLOSED", "REOPENED"],
  ["REOPENED", "IN_PROGRESS"],
  ["REOPENED", "WAITING_FOR_REQUESTER"],
  ["REOPENED", "CANCELLED"],
];
