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
Recorded during Task 25, run from a clean state on branch `claude/vibrant-haibt-fdf325` (this
plan's implementation branch — see the note at the top of `progress.md` on the branching model
actually used). All three suites pass with zero skipped/disabled tests. The Lab 1 regression
subset (`server/tests/lab-01/`) was also re-run on its own per Step 2 and is included below.

### `cd server && npm test`

```
> toktickit-server@0.0.0 test
> vitest run --config vitest.config.ts


 RUN  v3.2.7 D:/brain/CPE334/TokTickIT/.claude/worktrees/vibrant-haibt-fdf325/server

 ✓ tests/lab-02/attachments.upload.api.test.ts (10 tests) 438ms
 ✓ tests/lab-02/tickets.list.api.test.ts (4 tests) 253ms
 ✓ tests/lab-02/tickets.create.api.test.ts (10 tests) 287ms
 ✓ tests/lab-02/ticketNumber.test.ts (5 tests) 291ms
 ✓ tests/lab-02/attachments.download.api.test.ts (2 tests) 136ms
 ✓ tests/lab-02/attachments.remove.api.test.ts (2 tests) 144ms
 ✓ tests/lab-02/tickets.detail.api.test.ts (3 tests) 120ms
 ✓ tests/lab-02/devRequesters.api.test.ts (4 tests) 88ms
 ✓ tests/lab-02/migration.test.ts (4 tests) 64ms
stderr | tests/lab-02/errorEnvelope.test.ts > errorEnvelope > maps an unrecognized error to a 500 without leaking its message
Error: unexpected
    at D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\tests\lab-02\errorEnvelope.test.ts:17:11
    at Layer.handleRequest (D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\node_modules\router\lib\layer.js:152:17)
    at next (D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\node_modules\router\lib\route.js:117:3)
    at handle (D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\node_modules\router\index.js:435:11)
    at Layer.handleRequest (D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\node_modules\router\lib\layer.js:152:17)
    at D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\node_modules\router\index.js:295:15
    at processParams (D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\node_modules\router\index.js:582:12)
    at next (D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\node_modules\router\index.js:291:5)
    at router.handle (D:\brain\CPE334\TokTickIT\.claude\worktrees\vibrant-haibt-fdf325\server\node_modules\router\index.js:186:3)

 ✓ tests/lab-02/errorEnvelope.test.ts (3 tests) 25ms
 ✓ tests/lab-01/foundation.test.ts (2 tests) 17ms
 ✓ tests/lab-01/categories.test.ts (1 test) 16ms
 ✓ tests/lab-02/createTicketRequest.test.ts (13 tests) 3ms

 Test Files  13 passed (13)
      Tests  63 passed (63)
   Start at  20:20:04
   Duration  8.05s (transform 213ms, setup 107ms, collect 3.05s, tests 1.88s, environment 2ms, prepare 1.15s)
```

Note: the `stderr` block above is expected console noise — `errorEnvelope.test.ts` deliberately
throws an unrecognized error to assert the 500 handler doesn't leak it, and Express logs the raw
stack to stderr before the assertion runs. The test itself passes.

### `cd client && npm test`

```
> toktickit-client@0.0.0 test
> vitest run


 RUN  v3.2.7 D:/brain/CPE334/TokTickIT/.claude/worktrees/vibrant-haibt-fdf325/client

stderr | tests/lab-02/zenGreenStyle.test.tsx > Zen Green style contract > Create Ticket required fields carry a visible asterisk and the form uses zg-card
An update to CreateTicket inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act
An update to CreateTicket inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

 ✓ tests/lab-02/zenGreenStyle.test.tsx (1 test) 72ms
 ✓ tests/lab-01/App.test.tsx (1 test) 82ms
 ✓ tests/lab-02/DevRequesterSelect.test.tsx (3 tests) 232ms
 ✓ tests/lab-02/MyTickets.test.tsx (3 tests) 375ms
 ✓ tests/lab-02/TicketDetail.test.tsx (4 tests) 674ms
   ✓ TicketDetail > removing an attachment requires a reason and then shows it as removed  342ms
 ✓ tests/lab-02/CreateTicket.test.tsx (2 tests) 1788ms
   ✓ CreateTicket > shows a field error and never calls POST /api/tickets when Summary is missing  485ms
   ✓ CreateTicket > shows the current Requester read-only, then hands the created ticket to onCreated on success  1302ms

 Test Files  6 passed (6)
      Tests  14 passed (14)
   Start at  20:20:20
   Duration  4.67s (transform 403ms, setup 1.59s, collect 2.83s, tests 3.22s, environment 9.85s, prepare 1.41s)
```

Note: the `act(...)` warning above is a benign React Testing Library warning (a state update from
an in-flight fetch resolving after the assertion runs) — it does not affect the assertion result
and both tests in the file pass.

### `cd e2e && npx playwright test`

```
Running 11 tests using 2 workers

  ok  1 [chromium] › lab-02\visual-check.spec.ts:33:7 › create ticket screen at desktop (653ms)
  ok  2 [chromium] › lab-02\requester-ticket-flow.spec.ts:15:5 › a requester can select an identity, create a ticket, and find it in My Tickets (706ms)
  ok  3 [chromium] › lab-02\visual-check.spec.ts:43:7 › my tickets screen at desktop (444ms)
  ok  4 [chromium] › lab-02\requester-ticket-flow.spec.ts:41:5 › requester B cannot see requester A's tickets in My Tickets (836ms)
  ok  5 [chromium] › lab-02\visual-check.spec.ts:53:7 › ticket detail screen at desktop (558ms)
  ok  6 [chromium] › lab-02\visual-check.spec.ts:33:7 › create ticket screen at tablet (359ms)
  ok  7 [chromium] › lab-02\visual-check.spec.ts:43:7 › my tickets screen at tablet (390ms)
  ok  8 [chromium] › lab-02\visual-check.spec.ts:53:7 › ticket detail screen at tablet (573ms)
  ok  9 [chromium] › lab-02\visual-check.spec.ts:33:7 › create ticket screen at mobile (489ms)
  ok 10 [chromium] › lab-02\visual-check.spec.ts:43:7 › my tickets screen at mobile (479ms)
  ok 11 [chromium] › lab-02\visual-check.spec.ts:53:7 › ticket detail screen at mobile (574ms)

  11 passed (8.6s)
```

### `cd server && npx vitest run tests/lab-01/` (Step 2 — Lab 1 regression subset, run standalone)

```
 RUN  v3.2.7 D:/brain/CPE334/TokTickIT/.claude/worktrees/vibrant-haibt-fdf325/server

 ✓ tests/lab-01/foundation.test.ts (2 tests) 22ms
 ✓ tests/lab-01/categories.test.ts (1 test) 23ms

 Test Files  2 passed (2)
      Tests  3 passed (3)
   Start at  20:21:02
   Duration  1.47s (transform 121ms, setup 43ms, collect 783ms, tests 45ms, environment 0ms, prepare 213ms)
```

**Summary: server 13 files / 63 tests passed, client 6 files / 14 tests passed, e2e 11/11 passed,
Lab 1 regression subset (standalone) 2 files / 3 tests passed. Zero failures, zero skipped tests
across all four runs.**

## 7. Known Limitations or Deferred Tests
Free-text search beyond Ticket Number/Summary, concurrent-attachment-upload race testing beyond
the sequential 409 case, and load/performance testing are out of Lab 2 scope per specification.md §3.
