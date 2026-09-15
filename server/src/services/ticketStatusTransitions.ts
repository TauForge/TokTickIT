// server/src/services/ticketStatusTransitions.ts
export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

// specification.md §9. NEW->OPEN and REOPENED->OPEN are automatic (triggered by ownership
// assignment) and are deliberately NOT listed as a target here — isValidTransition() only
// backs the client-requestable PATCH .../status transitions.
const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: [],
  CANCELLED: [],
};

export const TERMINAL_STATUSES: TicketStatus[] = ["CLOSED", "CANCELLED"];

export function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// BR-18: a ticket locked in CLOSED/CANCELLED rejects every mutation except CLOSED->REOPENED.
// isTerminal() combined with isValidTransition() (which already allows CLOSED->REOPENED and
// nothing else from either terminal status) is enough for callers to pick the right error
// code: !isValidTransition && isTerminal => 409 TICKET_LOCKED, else 409 INVALID_STATUS_TRANSITION.
export function isTerminal(status: TicketStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
