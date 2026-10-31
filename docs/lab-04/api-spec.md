# Lab 4 API Specification (extends docs/lab-03/api-spec.md)

All Lab 3 endpoints, envelopes, cookies and error codes stay as they are, except where this file says a write
now requires `expectedVersion` (BR-17). Base path `/api/v1`. Session cookie auth as in Lab 3. Error body:
`{ "error": { "code": "...", "message": "..." } }` (stable, no stack traces).

## 1. Actions Taken
| # | Method & Path | Purpose | Auth | Success | Errors |
|---|---|---|---|---|---|
| 1 | GET /staff/tickets/:id/actions | list Actions of a Ticket | IT Staff, Administrator | 200 ActionDto[] | 401, 403, 404 |
| 2 | POST /staff/tickets/:id/actions | create an Action | IT Staff, Administrator | 201 ActionDto (200 on idempotent repeat) | 401, 403, 404, 409 TICKET_LOCKED, 422 |
| 3 | PATCH /staff/tickets/:id/actions/:actionId | update an Action | performer or Administrator | 200 ActionDto | 401, 403, 404, 409 STALE_UPDATE / TICKET_LOCKED, 422 VERSION_REQUIRED / field errors |
| 4 | GET /tickets/:id/actions | Requester read-only list | Requester (owner) | 200 ActionDto[] | 401, 403 (non-requester role), 404 |

No DELETE route exists (404). Header on #2: optional `Idempotency-Key` (8-64 chars).

### ActionDto
`{ id, ticketId, actionAt, description, result, followUpRequired, followUpNote | null, attachmentNotes | null,
performedBy: { id, displayName, role }, createdAt, updatedAt, version }`

### POST body
`{ description, result, followUpRequired?, followUpNote?, attachmentNotes?, actionAt? }`
Rules: description 1-2000, result 1-1000, attachmentNotes <= 500 (BR-05); followUpNote required when
`followUpRequired` is true, forbidden when false (BR-06); `actionAt` within [ticket.createdAt, now+5min] (BR-04).
`performedBy` is never read from the body (BR-03).

### PATCH body
`{ expectedVersion, description?, result?, followUpRequired?, followUpNote?, attachmentNotes?, actionAt? }`
Same field rules, applied to the merged result. `performedBy` and `createdAt` cannot change (BR-07).

## 2. Ticket workflow changes (Lab 3 routes)
| Method & Path | Change |
|---|---|
| PATCH /staff/tickets/:id/owner | body adds `expectedVersion`; 409 STALE_UPDATE, 422 VERSION_REQUIRED |
| PATCH /staff/tickets/:id/priority | body adds `expectedVersion`; same errors |
| PATCH /staff/tickets/:id/status | body adds `expectedVersion`; transitions per specification 6.1; 409 RESOLUTION_REQUIRES_ACTION when moving to RESOLVED with zero Actions; same stale errors |
| GET /staff/tickets, GET /staff/tickets/:id | response gains `version` |
| GET /staff/tickets | adds query `activeOnly=true` (status in NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED); `ownerId` accepts a user id or `unassigned` |
| GET /tickets/:id (Requester) | response gains `version` (read-only, not writable by Requesters) |

Every successful Ticket write returns the full updated `StaffTicketDetailDto` including the new `version`.
409 STALE_UPDATE body also carries `currentVersion`.

Resolution order for a write: authenticate (401), authorize role (403), find and ownership (404), validate body
(422), version check (409 STALE_UPDATE), business rule (409 TICKET_LOCKED / INVALID_STATUS_TRANSITION /
RESOLUTION_REQUIRES_ACTION), then write.

## 3. Dashboards
| # | Method & Path | Purpose | Auth | Success | Errors |
|---|---|---|---|---|---|
| 5 | GET /dashboard/requester | caller's own Ticket metrics | Requester | 200 RequesterDashboardDto | 401, 403 |
| 6 | GET /dashboard/staff | operational metrics | IT Staff, Administrator | 200 StaffDashboardDto | 401, 403 |

No query parameters. Responses are small (counts plus at most 5 rows per list), never whole Ticket collections.

### RequesterDashboardDto
```
{ counts: { myOpen, inProgress, waitingForMe, resolved, closed },
  recentlyUpdated: TicketRowDto[<=5], recentlyResolved: TicketRowDto[<=5], generatedAt }
TicketRowDto = { id, ticketNumber, summary, status, updatedAt }
```

### StaffDashboardDto
```
{ counts: { new, open, inProgress, waitingForRequester, myAssigned, unassigned,
            byItPriority: { LOW, MEDIUM, HIGH } },
  urgent: StaffRowDto[<=5], recentlyUpdated: StaffRowDto[<=5],
  myRecentActions: { id, ticketId, ticketNumber, description, actionAt }[<=5],
  userCounts?: { active, inactive, requester, itStaff, administrator },   // Administrator only
  generatedAt }
StaffRowDto = { id, ticketNumber, summary, status, itPriority, ownerDisplayName | null, updatedAt }
```
Calculations, zero states and drill-down links: specification.md section 6.3. All calculations run on the server
per request (BR-19). Empty data returns zeros and empty arrays, never an error.

## 4. Status codes used
200 OK, 201 Created, 401 unauthenticated, 403 wrong role or not the performer, 404 not found or not owned (never
403 for another Requester's data), 409 conflict (STALE_UPDATE, TICKET_LOCKED, INVALID_STATUS_TRANSITION,
RESOLUTION_REQUIRES_ACTION, IDEMPOTENCY_KEY_REUSED, INVALID_OWNER, SELF_DEACTIVATION_BLOCKED, LAST_ADMIN_PROTECTED, EMAIL_ALREADY_EXISTS),
422 validation (including VERSION_REQUIRED), 500 unexpected with a generic message.

## 5. Endpoint notes an implementer will otherwise get wrong
- Authorization is the order in section 2; a Requester hitting #1-#3 gets 403 even for their own Ticket (not 404),
  because the route namespace is staff-only; a Requester hitting #4 for someone else's Ticket gets 404.
- Resolution gate and the status write share one transaction, so a concurrent Action insert cannot be lost.
- Version check is `UPDATE ... WHERE id = ? AND version = ?` with `version = version + 1`; zero rows updated means
  STALE_UPDATE. Never read-then-write without the guard.
- A key reused by the same performer on a different Ticket returns 409 IDEMPOTENCY_KEY_REUSED, never the other Ticket's Action.
- Idempotent repeat returns 200 with the original Action; a different payload under the same key still returns
  the original (the key identifies the request, not the body).
- `activeOnly` and `status` can combine; `status` wins if it names a non-active status.
