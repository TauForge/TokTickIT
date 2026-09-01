# Lab 2 Test Plan and Results

## 1. Test Strategy
TDD throughout: every task below writes a failing test before implementation. Server tests run
against a dedicated `toktickit_test` database (never dev). Client tests use Testing Library.
E2E uses Playwright against a running dev-mode client+server. Visual checks use Playwright
screenshots at desktop (1280px)/tablet (820px)/mobile (390px).

## 2. Planned Tests

| Test ID | Type | AC | What It Tests | Automated Test File |
|---|---|---|---|---|
| UNIT-01 | Unit | AC-01,AC-09 | ticket number format + atomic increment | server/tests/lab-02/ticketNumber.test.ts |
| UNIT-02 | Unit | AC-04 | createTicketRequest boundary validation | server/tests/lab-02/createTicketRequest.test.ts |
| API-01 | API | AC-01 | POST /api/tickets creates a valid ticket | server/tests/lab-02/tickets.create.api.test.ts |
| API-02 | API | AC-04 | POST /api/tickets 422 on missing Summary | server/tests/lab-02/tickets.create.api.test.ts |
| API-03 | API | AC-03 | GET /api/tickets/:id 404 for non-owner | server/tests/lab-02/tickets.detail.api.test.ts |
| API-04 | API | AC-16 | GET /api/tickets pagination/sort defaults | server/tests/lab-02/tickets.list.api.test.ts |
| API-05 | API | AC-07,AC-08 | empty vs no-results list responses | server/tests/lab-02/tickets.list.api.test.ts |
| API-06 | API | AC-11,AC-12,AC-13 | attachment type/size validation | server/tests/lab-02/attachments.upload.api.test.ts |
| API-07 | API | AC-05 | 6th attachment returns 409 | server/tests/lab-02/attachments.upload.api.test.ts |
| API-08 | API | AC-06 | soft-removed attachment 404 on download | server/tests/lab-02/attachments.download.api.test.ts |
| API-09 | API | AC-17 | soft-remove requires reason, retains metadata | server/tests/lab-02/attachments.remove.api.test.ts |
| API-10 | API | FR-01 | GET /api/dev-requesters excludes inactive | server/tests/lab-02/devRequesters.api.test.ts |
| API-11 | API | AC-20 | ticket keeps a deactivated category's name after the category is deactivated | server/tests/lab-02/tickets.detail.api.test.ts |
| UI-01 | UI | AC-14,AC-15 | selector loading + API-failure states | client/src/screens/lab-02 tests/DevRequesterSelect.test.tsx |
| UI-02 | UI | AC-04,AC-19 | Create Ticket validation + busy state | client/src/screens/lab-02 tests/CreateTicket.test.tsx |
| UI-03 | UI | AC-07,AC-08 | My Tickets empty vs no-results | client/src/screens/lab-02 tests/MyTickets.test.tsx |
| UI-04 | UI | AC-17 | Ticket Detail attachment remove flow | client/src/screens/lab-02 tests/TicketDetail.test.tsx |
| UI-05 | UI | AC-11,AC-05 | Ticket Detail attachment upload success + limit-reached message | client/src/screens/lab-02 tests/TicketDetail.test.tsx |
| UI-06 | UI | AC-10 | safe error state + retained form values on backend failure | client/src/screens/lab-02 tests/CreateTicket.test.tsx |
| STYLE-01 | UI style | ui-spec.md | required CSS classes, asterisks, field states, button hierarchy present | client/src/screens/lab-02 tests/zenGreenStyle.test.tsx (Task 23) |
| VISUAL-01 | Visual | AC-18 | 3-viewport screenshots, no clipping/overflow, all 3 screens | scripts run in Task 23, see §4 |
| E2E-01 | E2E | AC-01,AC-02 | select requester -> create ticket -> see number | e2e/lab-02/requester-ticket-flow.spec.ts |
| E2E-02 | E2E | AC-03,AC-16 | requester A cannot see requester B's tickets | e2e/lab-02/requester-ticket-flow.spec.ts |

## 3. Acceptance-Criterion Traceability
Every AC-01..AC-20 maps to at least one row above. AC-01, AC-02, AC-03, AC-05, AC-06, AC-09,
AC-11, AC-19 each have 2+ tests across levels (API + UI or API + E2E). The remaining criteria
(AC-04, AC-07, AC-08, AC-10, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-20) currently
have exactly one automated test each, at the level shown above — acceptable per the labsheet's
minimum-coverage table, which requires presence at an appropriate level, not duplication.

## 4. Responsive and Visual Checklist
- [ ] No clipped labels, overlapping messages, or hidden buttons at any viewport.
- [ ] No unintended horizontal scrolling on mobile (<768px).
- [ ] Desktop table vs mobile card/responsive-table behavior verified for My Tickets.
- [ ] Badge consistency for Requested Priority, IT Priority, Current Status.
- [ ] Filters, pagination, attachment controls, and empty states usable at all viewport sizes.

## 5. Test Commands
- Server: `cd server && npm test`
- Client: `cd client && npm test`
- E2E: `cd e2e && npx playwright test`

## 6. Final Results
[Filled in during Task 25 — paste final `npm test` output from server and client, and
`npx playwright test` output, from the lab2-staging branch before the release PR.]

## 7. Known Limitations or Deferred Tests
Free-text search beyond Ticket Number/Summary, concurrent-attachment-upload race testing beyond
the sequential 409 case, and load/performance testing are out of Lab 2 scope per specification.md §3.
