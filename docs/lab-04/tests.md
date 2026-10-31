# Lab 4 Test Plan and Results

## 1. Test Strategy
TDD: every task writes a failing test first. Server tests run against `toktickit_test` (never dev), reset and
reseeded once per run. Client tests use Testing Library. E2E uses Playwright against a running dev client and
server at three viewports (desktop 1280, tablet 820, mobile 390). This plan is written before implementation; the
Final column starts as "Planned" and changes only after the suite has actually run (section 6).

## 2. Planned Tests
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | AC-23, BR-23 | migration on a Lab 3 database | no row lost, legacy Tickets have 0 Actions, `version` 0 | server/tests/lab-04/migration.test.ts | Pass (3 tests, scratch DB, 2026-10-31) |
| MIG-02 | Migration | AC-23 | rollback script on scratch DB | schema returns to Lab 3 shape, old data intact | server/tests/lab-04/migration.test.ts | Pass (1 test, scratch DB, 2026-10-31) |
| SEED-01 | Migration | AC-24, BR-24 | seed run twice | identical counts, no duplicates, covers all statuses/priorities/0-1-many Actions | server/tests/lab-04/seed.test.ts | Pass (4 tests, seed run twice, 2026-10-31) |
| UNIT-01 | Unit | BR-05, BR-06 | action input validator | length limits, follow-up note rule both ways | server/tests/lab-04/actionValidation.test.ts | Pass (8 tests, 2026-10-31) |
| UNIT-02 | Unit | BR-04 | action date window | rejects future (>5 min) and before ticket creation | server/tests/lab-04/actionValidation.test.ts | Pass (3 tests, 2026-10-31) |
| UNIT-03 | Unit | 6.1, AC-13, AC-14 | transition matrix over all 64 pairs | exactly the listed pairs valid | server/tests/lab-04/ticketTransitions.test.ts | Pass (64 pairs, 2026-10-31) |
| API-01 | API | AC-01, BR-03 | create Action as IT Staff | saved under Ticket, performer = session, body performer ignored | server/tests/lab-04/actions-taken.api.test.ts | Pass (2026-10-31) |
| API-02 | API | AC-03, BR-02 | non-owner staff creates Action | 201, Ticket owner unchanged | server/tests/lab-04/actions-taken.api.test.ts | Pass (2026-10-31) |
| API-03 | API | AC-04, AC-05 | follow-up rule | 422 both directions | server/tests/lab-04/actions-taken.api.test.ts | Pass (2026-10-31) |
| API-04 | API | AC-06, BR-10 | Requester create/update Action | 403, nothing written | server/tests/lab-04/actions-taken.api.test.ts | Pass (2026-10-31) |
| API-05 | API | AC-07, AC-08 | Requester lists Actions (own / other) | 200 stable order / 404 | server/tests/lab-04/actions-taken.api.test.ts | Pass (2026-10-31) |
| API-06 | API | AC-09, BR-08 | update by non-performer / performer / admin | 403 / 200 / 200 | server/tests/lab-04/actions-taken.api.test.ts | Pass (2026-10-31) |
| API-07 | API | AC-10, BR-07 | DELETE Action | 404, row still present | server/tests/lab-04/actions-taken.api.test.ts | Pass (2026-10-31) |
| API-08 | API | AC-18, BR-09 | Action on CANCELLED Ticket | 409 TICKET_LOCKED | server/tests/lab-04/actions-taken.api.test.ts | Pass (2026-10-31) |
| API-09 | API | AC-17, BR-18 | same Idempotency-Key twice | one row, second 200 original | server/tests/lab-04/actions-taken.api.test.ts | Pass (2026-10-31) |
| API-10 | API | AC-11, BR-13 | resolve with 0 then 1 Action | 409 then 200 | server/tests/lab-04/ticket-workflow.api.test.ts | Pass (2026-10-31) |
| API-11 | API | AC-12, BR-14 | advisory flag does not resolve or pass gate | status unchanged, gate still 409 | server/tests/lab-04/ticket-workflow.api.test.ts | Pass (2026-10-31) |
| API-12 | API | AC-13 | every status pair through PATCH | valid 200, others 409 correct code | server/tests/lab-04/ticket-workflow.api.test.ts | Pass (64 pairs, 2026-10-31) |
| API-13 | API | AC-14 | REOPENED to IN_PROGRESS | 200 | server/tests/lab-04/ticket-workflow.api.test.ts | Pass (2026-10-31) |
| API-14 | API | AC-15, BR-17 | stale status after priority change | 409 STALE_UPDATE with currentVersion, unchanged | server/tests/lab-04/ticket-workflow.api.test.ts | Pass (2026-10-31) |
| API-15 | API | AC-16 | missing expectedVersion on owner/priority/status/Action PATCH | 422 VERSION_REQUIRED | server/tests/lab-04/ticket-workflow.api.test.ts | Pass (2026-10-31) |
| API-16 | API | BR-15 | Requester status write | 403 | server/tests/lab-04/ticket-workflow.api.test.ts | Pass (2026-10-31) |
| API-17 | API | AC-02, BR-19 | Requester dashboard scoping | only own Tickets counted/listed | server/tests/lab-04/requester-dashboard.api.test.ts | Pass (2026-10-31) |
| API-18 | API | AC-20 | Requester with no Tickets | zeros, empty lists, 200 | server/tests/lab-04/requester-dashboard.api.test.ts | Pass (2026-10-31) |
| API-19 | API | AC-19 | each Requester metric vs SQL | equal | server/tests/lab-04/requester-dashboard.api.test.ts | Pass (2026-10-31) |
| API-20 | API | AC-19, AC-21 | staff metrics vs SQL, drill-down list equality | equal; Requester 403, anon 401 | server/tests/lab-04/staff-dashboard.api.test.ts | Pass (2026-10-31) |
| API-21 | API | AC-22 | Administrator userCounts present, staff absent | as stated | server/tests/lab-04/staff-dashboard.api.test.ts | Pass (2026-10-31) |
| API-22 | API | AC-20 | empty database staff dashboard | zeros, 200 | server/tests/lab-04/staff-dashboard.api.test.ts | Pass (2026-10-31) |
| API-23 | API | FR-18 | queue `activeOnly` and `ownerId` | correct subset | server/tests/lab-04/staff-dashboard.api.test.ts | Pass (2026-10-31) |
| AUTHZ-01 | Authorization | 6.2 matrix | every role x every Lab 4 endpoint | codes exactly as matrix | server/tests/lab-04/authorization.api.test.ts | Pass (actions, ticket write and dashboard endpoints, 2026-10-31) |
| PERF-01 | Performance smoke | BR-22 | dashboards on seeded plus 2,000 Tickets | each responds under 500 ms locally | server/tests/lab-04/performance.smoke.test.ts | Pass (2026-10-31) |
| REG-01 | Regression | AC-30, FR-25 | Lab 1, 2, 3 server suites | all pass (documented BR-17 updates only) | server/tests/lab-01..03/ | Planned |
| UI-01 | UI | AC-25, AC-26 | Actions Taken list, create, edit, validation, data kept | per state | client/tests/lab-04/ActionsTaken.test.tsx | Planned |
| UI-02 | UI | AC-25, AC-15 | status control, gate callout, stale callout, summary refresh | per state | client/tests/lab-04/TicketWorkflow.test.tsx | Planned |
| UI-03 | UI | FR-15, AC-20, AC-29 | Staff dashboard cards, links, states | per state | client/tests/lab-04/StaffDashboard.test.tsx | Planned |
| UI-04 | UI | FR-14, AC-02 | Requester dashboard cards, links, states | per state | client/tests/lab-04/RequesterDashboard.test.tsx | Planned |
| STYLE-01 | UI style | ui-spec | Zen Green classes, badges, no ad hoc styling | present | client/tests/lab-04/zenGreenStyleLab4.test.tsx | Planned |
| A11Y-01 | Accessibility | AC-28 | aria-current, labels, live region, focus, text status cues | present | client/tests/lab-04/accessibility.test.tsx | Planned |
| VISUAL-01 | Responsive/visual | AC-27 | 3 viewports, no overflow, screenshots saved | saved, checklist true | e2e/lab-04/dashboards.spec.ts | Planned |
| E2E-01 | E2E | AC-01, AC-03, AC-25 | staff adds, edits Actions; Requester sees them | full flow | e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| E2E-02 | E2E | AC-11, AC-14, AC-15 | resolve gate, reopen, stale conflict between two sessions | full flow | e2e/lab-04/ticket-resolution.spec.ts | Planned |
| E2E-03 | E2E | AC-02, AC-19, AC-22 | dashboards per role, drill-down opens filtered lists | full flow | e2e/lab-04/dashboards.spec.ts | Planned |
| E2E-04 | E2E | FR-25 | login, My Tickets, Attachments, comments, notes, admin users still work | full flow | e2e/lab-04/dashboards.spec.ts | Planned |

## 3. Acceptance-Criterion Traceability
AC-01 API-01, E2E-01 | AC-02 API-17, E2E-03 | AC-03 API-02, E2E-01 | AC-04 API-03, UNIT-01 | AC-05 API-03, UNIT-01 |
AC-06 API-04, AUTHZ-01 | AC-07 API-05 | AC-08 API-05 | AC-09 API-06 | AC-10 API-07 | AC-11 API-10, E2E-02 |
AC-12 API-11 | AC-13 UNIT-03, API-12 | AC-14 API-13, E2E-02 | AC-15 API-14, UI-02, E2E-02 | AC-16 API-15 |
AC-17 API-09 | AC-18 API-08 | AC-19 API-19, API-20, E2E-03 | AC-20 API-18, API-22, UI-03 | AC-21 API-20, AUTHZ-01 |
AC-22 API-21, E2E-03 | AC-23 MIG-01, MIG-02 | AC-24 SEED-01 | AC-25 UI-01, UI-02, E2E-01 | AC-26 UI-01 |
AC-27 VISUAL-01 | AC-28 A11Y-01 | AC-29 UI-03, UI-04 | AC-30 REG-01. Every AC has at least one test.

## 4. Responsive and Visual Checklist
To be completed from the screenshots in `artifacts/lab-04/screenshots/` (see ui-spec.md checklist). Not yet run.

## 5. Test Commands
- Server: `cd server && npm test`
- Client: `cd client && npm test`
- E2E: `cd e2e && npx playwright test`

## 6. Final Results
Not yet run. Filled in from the final `main` run, including complete output and any intentional test change
(for example Lab 3 tests updated to send `expectedVersion` per BR-17).
