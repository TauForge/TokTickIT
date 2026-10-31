# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal
Add Actions Taken under every Ticket, finish the Ticket status rules with a server-enforced resolution gate and
stale-update protection, give Requesters, IT Staff and Administrators concise backend-calculated dashboards, and
harden the whole Lab 1-3 application so it behaves as one coherent Zen Green product ready for demonstration.

## 2. Stakeholder Request Interpretation
The service desk can receive Tickets and IT Staff can talk to Requesters, but nobody can record the actual work.
Each Ticket needs a list of Actions Taken, written by any IT Staff member or Administrator, while the primary
Ticket Owner stays responsible for the Ticket as a whole. Requesters can read the Actions Taken on their own
Tickets but never write them. A Requester saying "problem appears resolved" stays advisory; only staff move a
Ticket to Resolved, and the server refuses that move unless work was recorded. Dashboards give each role a
starting point and link to the detailed lists, they do not replace them. Everything from Labs 1-3 keeps working.

## 3. Scope
### Included
Actions Taken (create, update, list); final status transition matrix and resolution gate; stale-update and
duplicate-submit protection on Ticket and Action writes; Requester, IT Staff and Administrator dashboards with
drill-down; Dashboard navigation; migration, rollback, idempotent seed; Zen Green UI extensions; accessibility
and final polish; README refresh; full Labs 1-3 regression.

### Excluded
SLA clocks, escalation, on-call, breach notices; email/SMS/LINE/push notifications; inventory, parts, purchasing,
service cost accounting; time sheets, payroll, labor cost; multi-level approvals and e-signatures; BI tools,
custom reports, export warehouses; multi-tenant and production-scale cloud; deleting Actions Taken; a separate
assignee on an Action; dashboard "change since yesterday" deltas; any feature not listed in this contract.

## 4. Functional Requirements
FR-01 System shall let an IT Staff or Administrator user create an Action Taken on any Ticket that is not
CANCELLED.
FR-02 System shall record, per Action Taken: action date/time, description, result, performed by (set by the
server from the session), follow-up required flag, follow-up note, and attachment notes.
FR-03 System shall require a follow-up note whenever the follow-up required flag is true.
FR-04 System shall let the performing user, or any Administrator, update an existing Action Taken.
FR-05 System shall expose no endpoint that deletes an Action Taken.
FR-06 System shall list the Actions Taken of a Ticket in stable order: action date/time ascending, then id.
FR-07 System shall let a Requester read every Action Taken of a Ticket they own, and nothing else about Actions.
FR-08 System shall let IT Staff and Administrators read Actions Taken of any Ticket.
FR-09 System shall reject a move to RESOLVED when the Ticket has zero Actions Taken.
FR-10 System shall enforce the final status transition matrix (section 6) on the server for every client.
FR-11 System shall reject any Ticket owner, IT Priority, status or Action update whose expected version does not
match the stored version, without changing data.
FR-12 System shall return the new version with every successful Ticket or Action write.
FR-13 System shall treat a repeated Action create carrying the same idempotency key from the same user as the
original request and return the original Action instead of creating a second one.
FR-14 System shall provide a Requester dashboard endpoint returning only the authenticated Requester's counts
and Ticket lists.
FR-15 System shall provide an IT Staff dashboard endpoint, available to IT Staff and Administrators, returning
the metrics defined in section 6.
FR-16 System shall add active user counts to the dashboard response for Administrators only.
FR-17 System shall calculate every dashboard value on the server from stored data per request.
FR-18 System shall let the IT Staff Ticket Queue filter to active tickets owned by a user (`activeOnly`) so every
staff dashboard count can be reproduced by its drill-down link.
FR-19 System shall show an Actions Taken area on Staff Ticket Detail with list, create mode and view/edit mode,
and a read-only Actions Taken list on Requester Ticket Detail.
FR-20 System shall show only permitted next statuses in the status control and refresh the Ticket summary status
after a successful change.
FR-21 System shall provide role-appropriate Dashboard navigation with a clear active-page indicator.
FR-22 System shall present loading, validation, success, empty, no-results, forbidden, conflict, not-found and
safe-failure states consistently on every Lab 4 screen.
FR-23 System shall keep entered form data after a recoverable failure and shall lock submit controls while a
request is in flight.
FR-24 System shall remove leftover temporary, duplicate or obsolete UI from earlier labs and ship with no console
errors, broken links or placeholder text.
FR-25 System shall keep every Lab 1-3 endpoint and screen working for its permitted roles.
FR-26 System shall document setup, seed, migration, test and demonstration steps in the README.

## 5. Business Rules
BR-01 An Action Taken belongs to exactly one Ticket and never moves to another Ticket.
BR-02 The Ticket Owner coordinates the Ticket, but an Action Taken may be performed by any active IT Staff or
Administrator user, not only the owner.
BR-03 Performed by is always the authenticated user; a client-supplied performer is ignored.
BR-04 Action date/time defaults to the server time at creation. A client may supply it, but it must not be later
than server time plus 5 minutes and not earlier than the Ticket's creation time, compared at minute precision because the form's date/time input has
no seconds (422 otherwise).
BR-05 Description is required, 1-2000 characters after trimming. Result is required, 1-1000 characters. Attachment
notes are optional, up to 500 characters.
BR-06 Follow-up required is a boolean, default false. When true, follow-up note is required (1-1000 characters).
When false, any supplied follow-up note is rejected with 422 so stale text cannot linger.
BR-07 Actions Taken are never deleted. An update changes the row and increments its version; `createdAt` and
`performedById` never change.
BR-08 Only the performing user or an Administrator may update an Action; another IT Staff user receives 403.
BR-09 No Action may be created or updated on a CANCELLED Ticket (409 `TICKET_LOCKED`). Actions may be added to a
CLOSED Ticket only through reopening it first.
BR-10 Requesters never create or change Actions Taken; every Action write from a Requester returns 403.
A Requester requesting an Action of another Requester's Ticket receives 404.
BR-11 The Ticket statuses are NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED,
CANCELLED. Only the transitions in section 6 are valid; any other request returns 409
`INVALID_STATUS_TRANSITION`, or 409 `TICKET_LOCKED` from a terminal status.
BR-12 NEW to OPEN and REOPENED to OPEN happen automatically on ownership assignment (unchanged from Lab 3) and
are never client-requestable.
BR-13 Resolution gate: a Ticket may move to RESOLVED only if it has at least one Action Taken, otherwise 409
`RESOLUTION_REQUIRES_ACTION`. The gate is checked inside the same transaction as the status write.
BR-14 A Requester's "problem appears resolved" flag is advisory. It never changes the status and never satisfies
the resolution gate.
BR-15 Only IT Staff and Administrators change status. A Requester status write returns 403.
BR-16 Every Ticket and Action has an integer `version`, starting at 0, incremented by 1 on every successful
write to that row.
BR-17 Ticket owner, IT Priority and status writes, and Action updates, must carry `expectedVersion`. A missing
value returns 422 `VERSION_REQUIRED`; a value different from the stored version returns 409 `STALE_UPDATE` with
the current version, and nothing is written.
BR-18 Action create may carry an `Idempotency-Key` header (8-64 characters). The pair (performer, key) is unique;
a repeat returns the original Action with 200 instead of 201 and creates nothing.
BR-19 Dashboards are calculated by the backend per request, from the database, scoped to the caller. A Requester
dashboard contains only that Requester's Tickets (BR-23 of Lab 3 ownership rules still apply).
BR-20 "Open" Ticket means status in NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED. "Active" means the
same set. RESOLVED, CLOSED and CANCELLED are never active.
BR-21 "Recent" is a rolling window from the request instant: lists are the top 5 rows by the stated sort; the
resolved list only includes Tickets updated within the last 30 days. Dates are shown to users in Asia/Bangkok.
BR-22 Every dashboard metric has a defined query, a zero state (value 0 or empty list, never an error) and a
drill-down destination (section 6). A count and its drill-down list must agree at the time of the request.
BR-23 Migration is additive: no existing User, Ticket, Attachment, Comment or Internal Note is changed except by
adding `Ticket.version` with default 0. Legacy Tickets simply have zero Actions Taken and count normally in
dashboards.
BR-24 The seed is idempotent: it identifies its own rows by fixed natural keys, upserts them, and never
duplicates or removes rows created by users or tests.
BR-25 Every Lab 1-3 business rule continues to hold unless this document explicitly refines it (BR-11 refines
Lab 3 BR-19; BR-17 adds a stale check to Lab 3 owner/priority/status writes).
BR-26 Error responses use the Lab 3 envelope and codes; none leaks stack traces or internal identifiers.
BR-27 Priority values are LOW, MEDIUM, HIGH, as stored in the `Priority` enum.

## 6. Ticket Rules, Authorization and Dashboard Definitions
### 6.1 Final Ticket status transition matrix
| From | To | Who | Notes |
|---|---|---|---|
| NEW | OPEN | system | automatic on first ownership assignment |
| NEW | CANCELLED | IT Staff, Administrator | |
| OPEN | IN_PROGRESS | IT Staff, Administrator | |
| OPEN | WAITING_FOR_REQUESTER | IT Staff, Administrator | |
| OPEN | CANCELLED | IT Staff, Administrator | |
| IN_PROGRESS | WAITING_FOR_REQUESTER | IT Staff, Administrator | |
| IN_PROGRESS | RESOLVED | IT Staff, Administrator | resolution gate (BR-13) |
| IN_PROGRESS | CANCELLED | IT Staff, Administrator | new in Lab 4 |
| WAITING_FOR_REQUESTER | IN_PROGRESS | IT Staff, Administrator | |
| WAITING_FOR_REQUESTER | RESOLVED | IT Staff, Administrator | resolution gate (BR-13) |
| WAITING_FOR_REQUESTER | CANCELLED | IT Staff, Administrator | |
| RESOLVED | CLOSED | IT Staff, Administrator | |
| RESOLVED | REOPENED | IT Staff, Administrator | |
| CLOSED | REOPENED | IT Staff, Administrator | |
| REOPENED | OPEN | system | automatic on ownership assignment |
| REOPENED | IN_PROGRESS | IT Staff, Administrator | new in Lab 4: fixes the Lab 3 dead end |
| REOPENED | WAITING_FOR_REQUESTER | IT Staff, Administrator | new in Lab 4 |
| REOPENED | CANCELLED | IT Staff, Administrator | new in Lab 4 |

Terminal: CLOSED (except to REOPENED) and CANCELLED (no exits). Requesters have no status transitions.

### 6.2 Authorization matrix (Lab 4 additions)
| Operation | Unauthenticated | Requester (owner) | Requester (other) | IT Staff | Administrator |
|---|---|---|---|---|---|
| List Actions Taken of a Ticket | 401 | 200 | 404 | 200 | 200 |
| Create Action Taken | 401 | 403 | 404 | 201 | 201 |
| Update Action Taken | 401 | 403 | 404 | 200 if performer, else 403 | 200 |
| Delete Action Taken | no route | no route | no route | no route | no route |
| PATCH ticket owner / priority / status | 401 | 403 | 403 | 200 | 200 |
| Requester dashboard | 401 | 200 | n/a | 403 | 403 |
| Staff dashboard | 401 | 403 | 403 | 200 | 200 (+ user counts) |

### 6.3 Dashboard metrics
Requester (`GET /api/v1/dashboard/requester`), all with `requesterId = caller`:
| Metric | Calculation | Zero state | Drill-down |
|---|---|---|---|
| myOpen | count status in open set | 0 | /my-tickets (no filter, open set) |
| inProgress | count IN_PROGRESS | 0 | /my-tickets?status=IN_PROGRESS |
| waitingForMe | count WAITING_FOR_REQUESTER | 0 | /my-tickets?status=WAITING_FOR_REQUESTER |
| resolved | count RESOLVED | 0 | /my-tickets?status=RESOLVED |
| closed | count CLOSED | 0 | /my-tickets?status=CLOSED |
| recentlyUpdated | top 5 by updatedAt desc | empty list | each row opens Ticket Detail |
| recentlyResolved | top 5 RESOLVED or CLOSED with updatedAt in last 30 days, updatedAt desc | empty list | each row opens Ticket Detail |

IT Staff (`GET /api/v1/dashboard/staff`):
| Metric | Calculation | Zero state | Drill-down |
|---|---|---|---|
| new | count NEW | 0 | /staff/tickets?status=NEW |
| open | count OPEN | 0 | ?status=OPEN |
| inProgress | count IN_PROGRESS | 0 | ?status=IN_PROGRESS |
| waitingForRequester | count WAITING_FOR_REQUESTER | 0 | ?status=WAITING_FOR_REQUESTER |
| myAssigned | active Tickets with ownerId = caller | 0 | ?ownerId={me}&activeOnly=true |
| unassigned | active Tickets with ownerId null | 0 | ?ownerId=unassigned&activeOnly=true |
| byItPriority | active Tickets grouped LOW/MEDIUM/HIGH | each 0 | ?itPriority=X&activeOnly=true |
| urgent | active Tickets with itPriority HIGH, oldest createdAt first, top 5 | empty list | row opens Ticket Detail |
| recentlyUpdated | top 5 by updatedAt desc, all Tickets | empty list | row opens Ticket Detail |
| myRecentActions | top 5 Actions with performedBy = caller, actionAt desc | empty list | row opens its Ticket Detail |
| userCounts (Administrator only) | active, inactive, and per-role counts | zeros | /admin/users |

## 7. UI Specification Summary
See ui-spec.md. Staff Ticket Detail gains an Actions Taken area (list, create, view/edit); Requester Ticket Detail
gains a read-only list. Two dashboard screens and a Dashboard nav item are added. All screens reuse Lab 2/3 Zen
Green tokens, badges, tabs, tables, cards and responsive rules.

## 8. Data Changes
- New model `ActionTaken`: id (uuid), ticketId FK (Restrict), performedById FK to User (Restrict), actionAt,
  description, result, followUpRequired, followUpNote?, attachmentNotes?, idempotencyKey?, version Int default 0,
  createdAt, updatedAt. Indexes: `[ticketId, actionAt, id]`, `[performedById, actionAt]`; unique
  `[performedById, idempotencyKey]`.
- `Ticket` gains `version Int @default(0)` and relation `actions ActionTaken[]`. Added index
  `[ownerId, status]` for dashboard counts and `[updatedAt]` for recent lists.
- Migration `lab4_actions_taken` is additive only (BR-23). Rollback script `rollback.sql` drops the new table,
  the two indexes and `Ticket.version`; it is exercised against a scratch database in the migration test.
- Backfill: none required. Legacy Tickets have zero Actions and `version` 0. RESOLVED/CLOSED legacy Tickets stay
  as they are; the resolution gate only applies to new transitions.
- Seed: idempotent upsert keyed on fixed ticket numbers `SEED4-001` to `SEED4-012`: all 8 statuses, LOW/MEDIUM/HIGH,
  assigned and unassigned, Tickets with 0, 1 and 3 Actions, plus a Requester account with no Tickets
  (`empty.requester@toktickit.dev`) to show zero-state dashboards.
- Design decisions: (1) a separate `ActionTaken` table, not a JSON column on Ticket, so Actions are queryable by
  performer and date for dashboards, indexed, and constrained by foreign keys; (2) integer `version` columns, not
  `updatedAt` comparison, because timestamps can collide within one millisecond and clients can't be trusted to echo
  them exactly; (3) `Restrict` on both foreign keys so an Action can never silently disappear with a user or Ticket,
  which also supports the append-only audit rule; (4) a unique (performer, key) pair for idempotency so retries
  are safe at the database, not just in application code.

## 9. API Contract
See api-spec.md. Summary: `GET/POST /api/v1/staff/tickets/:id/actions`, `PATCH /api/v1/staff/tickets/:id/actions/:actionId`,
`GET /api/v1/tickets/:id/actions` (Requester, read-only), `GET /api/v1/dashboard/requester`,
`GET /api/v1/dashboard/staff`; existing owner, priority, status PATCH routes gain `expectedVersion`; the staff
queue gains `activeOnly`.

## 10. Acceptance Criteria
AC-01 Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the
correct Ticket with the authenticated user as performer.
AC-02 Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets
owned by that Requester are returned.
AC-03 Given a different IT Staff user than the owner, when they create an Action on the Ticket, then it is saved
and the Ticket Owner is unchanged.
AC-04 Given follow-up required is true and no follow-up note, when an Action is created, then the API returns 422.
AC-05 Given follow-up required is false and a follow-up note is supplied, when an Action is created, then the API
returns 422.
AC-06 Given a Requester, when they create or update an Action, then the API returns 403 and nothing is written.
AC-07 Given a Requester who does not own the Ticket, when they list its Actions, then the API returns 404.
AC-08 Given a Requester who owns the Ticket, when they list its Actions, then every Action is returned in stable
order.
AC-09 Given an IT Staff user who is not the performer, when they update an Action, then the API returns 403; an
Administrator may update it.
AC-10 Given no delete route, when a DELETE is sent to an Action URL, then the API returns 404.
AC-11 Given a Ticket with zero Actions, when staff request RESOLVED, then the API returns 409
`RESOLUTION_REQUIRES_ACTION`; after one Action exists the same request succeeds.
AC-12 Given the Requester's "appears resolved" flag is set, when status is still IN_PROGRESS, then the status is
unchanged and the resolution gate still applies.
AC-13 Given every pair of statuses, when staff request each transition, then exactly the pairs in section 6.1 are
accepted and all others return 409 with the documented code.
AC-14 Given a REOPENED Ticket, when staff request IN_PROGRESS, then it succeeds (Lab 3 dead end removed).
AC-15 Given two staff users hold version 3 of a Ticket, when the first changes priority and the second then changes
status with expectedVersion 3, then the second receives 409 `STALE_UPDATE` and the Ticket is unchanged by it.
AC-16 Given a write without `expectedVersion`, when sent to owner, priority, status or Action update, then the API
returns 422 `VERSION_REQUIRED`.
AC-17 Given the same Idempotency-Key sent twice by one user, when creating an Action, then exactly one Action
exists and the second response returns the original.
AC-18 Given a CANCELLED Ticket, when staff create an Action, then the API returns 409 `TICKET_LOCKED`.
AC-19 Given the IT Staff dashboard, when each count is compared with the database and with its drill-down list,
then they match.
AC-20 Given zero matching records, when any dashboard is retrieved, then counts are 0, lists are empty, and no
error is returned.
AC-21 Given a Requester or unauthenticated caller, when the staff dashboard is requested, then the API returns
403 or 401 and no data.
AC-22 Given an Administrator, when the staff dashboard is retrieved, then `userCounts` is present; for IT Staff it
is absent.
AC-23 Given existing Lab 1-3 data, when the migration runs, then no row is lost and legacy Tickets show zero
Actions; the rollback script restores the previous schema.
AC-24 Given the seed is run twice, then the row counts are identical and no duplicates exist.
AC-25 Given Staff Ticket Detail, when an Action is created, edited, or a status changes, then the list and the
Ticket summary status refresh without a full reload.
AC-26 Given a failed submit, when the user retries, then entered form data is preserved and a repeated click does
not create a duplicate.
AC-27 Given a mobile viewport (<768px), when any Lab 4 screen renders, then nothing is clipped and there is no
horizontal scroll.
AC-28 Given the keyboard only, when a user operates dashboards, cards and the Actions Taken form, then every
control is reachable, focus is visible, and status is conveyed by text as well as color.
AC-29 Given the backend is unreachable, when a Lab 4 screen loads or submits, then a safe generic error is shown.
AC-30 Given the Lab 1-3 test suites, when run from the final branch, then they pass, except changes listed in
tests.md section 6 that follow BR-17.

## 11. Definition of Done
- [ ] Every AC has at least one passing automated test traced in tests.md.
- [ ] Every FR and BR is implemented; any gap is written here, not dropped.
- [ ] Unit, API, UI component, UI style, responsive, authorization, workflow, migration/regression,
  performance-smoke and E2E tests all pass from the final `main`.
- [ ] No required test is skipped, disabled or commented out.
- [ ] Labs 1-3 behavior still works; any intentional test change is listed in tests.md.
- [ ] Migration and its rollback are tested; seed runs twice cleanly.
- [ ] Dashboard counts verified against database queries (evidence saved).
- [ ] No console errors, broken links, placeholders or unfinished controls on any screen.
- [ ] Accessibility and visual checklist in ui-spec.md completed from the screenshots.
- [ ] README setup, seed, migration, test and demo steps are current.
- [ ] All Lab 4 Issues merged into `lab4-staging` through peer-reviewed PRs, then into `main`; Kanban all Done.
- [ ] These four spec documents existed before the implementation PRs merged (commit history).

## 12. Assumptions and Decisions
- Performed by is the authenticated user; there is no separate "assignee" on an Action (handout AC-01 "approved
  assignee" is read as the authenticated actor). The handout's "assign, complete, cancel, inactive-assignee" map to
  Ticket Owner assignment, move to RESOLVED, move to CANCELLED, and the existing 409 `INVALID_OWNER`.
- Actions are editable but never deletable, so "append-only" means no removal and no reordering.
- The resolution gate is "at least one Action Taken", the smallest rule that makes "backend resolution rule"
  checkable and matches "IT Staff must review the work".
- Requesters see follow-up and attachment notes (handout 8.3 says Requesters see all Actions Taken); private
  discussion belongs in Internal Notes.
- `expectedVersion` is required, so Lab 3 server tests that patch owner, priority or status are updated to send it.
- Rolling windows are used instead of calendar days, so no day-boundary time zone ambiguity affects any count.
- Lab 3's ui-spec lists an Urgent priority; the real enum is LOW, MEDIUM, HIGH, and this contract follows the code.
