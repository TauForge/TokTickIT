# Lab 3 Test Plan and Results

## 1. Test Strategy
TDD throughout: every task in the implementation plan writes a failing test before code. Server
tests run against `toktickit_test` (never dev), reset+reseeded once per run via globalSetup. Client
tests use Testing Library. E2E uses Playwright against a running dev-mode client+server, 3
responsive projects (desktop 1280px / tablet 820px / mobile 390px). This plan was created before
implementation, per the sheet's Test DD requirement — the "Final" column below started as
"Planned" until the corresponding task landed and the suite was actually run; see §6 for the
final run's results.

## 2. Planned Tests

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| MIG-01 | Migration | AC-12 (Lab 2) | TicketStatus enum renamed/extended with zero data loss | 8 values present, no ASSIGNED/PENDING_REQUESTER, existing rows readable | server/tests/lab-03/migration.test.ts | Passed |
| SEED-01 | Migration | §6.2 seed minimums | idempotent seed meets role/active-state counts | 3+1 IT Staff, 1+ Admin, 4+1 Requester, exactly 1 mustChangePassword=true | server/tests/lab-03/seed.test.ts | Passed |
| UNIT-01 | Unit | BR-07,BR-08 | password hashing + policy validator | bcrypt hash verifies; policy rejects <8 chars / missing class | server/tests/lab-03/password.test.ts | Passed |
| UNIT-02 | Unit | BR-09,BR-10 | session issuance/verification/revocation helpers | valid token resolves user; revoked/expired token resolves null | server/tests/lab-03/session.test.ts | Passed |
| UNIT-03 | Unit | §9 transition matrix | isValidTransition() against all 14 valid + sample invalid pairs | valid pairs true, invalid pairs false incl. terminal-state locks | server/tests/lab-03/ticketStatusTransitions.test.ts | Passed |
| API-01 | API | AC-01 | POST /auth/login with valid credentials | 200 + session cookie set + MeDto body | server/tests/lab-03/auth.api.test.ts | Passed |
| API-02 | API | AC-06 | POST /auth/login wrong password / unknown email | 401 INVALID_CREDENTIALS, identical message both cases | server/tests/lab-03/auth.api.test.ts | Passed |
| API-03 | API | AC-05 | POST /auth/login inactive user | 403 ACCOUNT_DEACTIVATED, no cookie set | server/tests/lab-03/auth.api.test.ts | Passed |
| API-04 | API | AC-07 | POST /auth/logout then reuse cookie | 200 then 401 on next request | server/tests/lab-03/auth.api.test.ts | Passed |
| API-05 | API | AC-02,BR-02 | mustChangePassword blocks non-auth routes | 403 PASSWORD_CHANGE_REQUIRED until change-password succeeds | server/tests/lab-03/changePassword.api.test.ts | Passed |
| API-06 | API | BR-11 | live isActive re-check mid-session | deactivating a user server-side invalidates their next request | server/tests/lab-03/sessionLiveCheck.api.test.ts | Passed |
| API-07 | API | AC-03,BR-03 | Requester-supplied requesterId ignored | authenticated identity wins, body field has no effect | server/tests/lab-03/requesterRegression.api.test.ts | Passed |
| API-08 | API | AC-04 | Requester requests Internal Note endpoint | 403 FORBIDDEN_ROLE, no note data returned | server/tests/lab-03/notes.api.test.ts | Passed |
| API-09 | API | AC-09 (Lab 2 BR-18 carried forward) | cross-Requester ticket access | 404, not 403, no data leaked | server/tests/lab-03/requesterRegression.api.test.ts | Passed |
| API-10 | API | AC-08 | Requester posts + fetches Public Comment | comment visible with author name + role tag | server/tests/lab-03/comments.api.test.ts | Passed |
| API-11 | API | BR-21 | empty/whitespace comment or note rejected | 422 on both endpoints | server/tests/lab-03/commentsNotesValidation.api.test.ts | Passed |
| API-12 | API | AC-14 | staff queue search/filter/sort/pagination | correct subset + stable ordering across pages | server/tests/lab-03/staffQueue.api.test.ts | Passed |
| API-13 | API | BR-25 | invalid page/pageSize/sort falls back to default | no 400, defaults applied | server/tests/lab-03/staffQueue.api.test.ts | Passed |
| API-14 | API | AC-10,BR-15 | claim unassigned ticket auto-transitions NEW->OPEN | owner set, status OPEN, not requestable directly | server/tests/lab-03/staffTicketOwner.api.test.ts | Passed |
| API-15 | API | BR-14 | assign to inactive/Requester-role user rejected | 409 INVALID_OWNER | server/tests/lab-03/staffTicketOwner.api.test.ts | Passed |
| API-16 | API | AC-12,BR-17 | IT Priority change leaves Requested Priority untouched | requestedPriority unchanged after itPriority PATCH | server/tests/lab-03/staffTicketPriority.api.test.ts | Passed |
| API-17 | API | AC-11,BR-18,BR-19 | full 14-row transition matrix incl. locked-state rejections | every valid pair 200, every invalid pair 409 with correct code | server/tests/lab-03/staffTicketStatus.api.test.ts | Passed |
| API-18 | API | AC-13,BR-04 | Internal Note never appears in Requester comment response | staff-created note absent from GET /tickets/:id/comments | server/tests/lab-03/notes.api.test.ts | Passed |
| API-19 | API | FR-18 | staff attachment list is read-only | GET returns list; no upload/remove route exists (404 on attempt) | server/tests/lab-03/staffAttachments.api.test.ts | Passed |
| API-20 | API | AC-15,BR-12 | duplicate email on create/edit | 409 EMAIL_ALREADY_EXISTS, no row created/changed | server/tests/lab-03/usersAdmin.api.test.ts | Passed |
| API-21 | API | AC-16,BR-29,BR-30 | self-deactivation + last-admin protection | both rejected with 409, account stays active | server/tests/lab-03/usersAdmin.api.test.ts | Passed |
| API-22 | API | AC-17,FR-22 | admin-set password forces mustChangePassword | target user forced to Change Password at next login | server/tests/lab-03/usersAdmin.api.test.ts | Passed |
| API-23 | API | AC-18 | non-Administrator calls /admin/users* | 403 for Requester and for IT Staff, no data returned | server/tests/lab-03/authorization.api.test.ts | Passed |
| API-24 | API | BR-27 | Lab 2 dev-header seam fully removed | x-dev-requester-id header has no effect; dev endpoints gone | server/tests/lab-03/devSeamRemoval.api.test.ts | Passed |
| REG-01 | Regression | Definition of Done | Lab 1 + Lab 2 suites pass unmodified post-migration | zero failures, zero skipped | server/tests/lab-01/, server/tests/lab-02/ (existing) | Passed |
| UI-01 | UI | AC-01,AC-06 | Login form validation + failure states | field errors, generic invalid-credentials message, busy state | client/.../lab-03 tests/Login.test.tsx | Passed |
| UI-02 | UI | AC-02 | Change Password policy checklist + gate | checklist updates live, screen blocks navigation until valid | client/.../lab-03 tests/ChangePassword.test.tsx | Passed |
| UI-03 | UI | AC-14,AC-20,§ui-spec.md §3 | Staff Queue search/filter/sort/pagination + empty/no-results + unreachable-backend error | correct rendering per state | client/.../lab-03 tests/StaffTicketQueue.test.tsx | Passed |
| UI-04 | UI | §ui-spec.md §4 | Staff Ticket Detail owner/priority/status edit + comments/notes tabs | edits call correct endpoints; notes tab visually distinct | client/.../lab-03 tests/StaffTicketDetail.test.tsx | Passed |
| UI-05 | UI | §ui-spec.md §5 | Admin create/edit user drawer, disabled-button tooltips | drawer validation, self-deactivation button disabled+tooltip | client/.../lab-03 tests/UserManagement.test.tsx | Passed |
| STYLE-01 | UI style | ui-spec.md | Zen Green tokens/badges/role tags applied on all 5 new/changed screens | required CSS classes present, no ad hoc styling | client/.../lab-03 tests/zenGreenStyleLab3.test.tsx | Passed |
| VISUAL-01 | Visual | AC-19 | 3-viewport screenshots, no clipping/overflow, all Lab 3 screens | screenshots saved, checklist in ui-spec.md satisfied | e2e/lab-03/visual-states.spec.ts | Passed |
| E2E-01 | E2E | AC-01,AC-06,AC-07 | login (valid/invalid), logout, direct access blocked after logout | full auth round trip | e2e/lab-03/authentication.spec.ts | Passed |
| E2E-02 | E2E | AC-02 | Initial password login and change | Normal app opens only after valid change | e2e/lab-03/authentication.spec.ts | Passed |
| E2E-03 | E2E | AC-10,AC-11,AC-08 | claim -> reassign -> priority -> status -> comment -> note flow | full staff ticket lifecycle, notes never visible to Requester tab | e2e/lab-03/staff-ticket-flow.spec.ts | Passed |
| E2E-04 | E2E | AC-15,AC-16,AC-17 | create/edit/deactivate user, self-deactivation blocked, password reset forces change | full admin lifecycle | e2e/lab-03/user-administration.spec.ts | Passed |

## 3. Acceptance-Criterion Traceability
AC-01 through AC-20 (specification.md §10) each resolve to at least one row above. AC-01, AC-02,
AC-06, AC-08, AC-10, AC-11, AC-14, AC-15, AC-16, AC-17 each have 2+ tests across levels (API + E2E
or API + UI). The sheet's own three given examples are reused verbatim as API-01 (Valid login),
API-08 (Requester requests Internal Notes), and E2E-02 (Initial password login and change).

## 4. Responsive and Visual Checklist
- [ ] No clipped labels, overlapping messages, or hidden buttons at any viewport, on any of the 4
  new/changed screens (Login/Change Password, Requester Ticket Detail w/ comments, Staff Queue,
  Staff Ticket Detail, Admin User Management).
- [ ] No unintended horizontal scrolling on mobile (<768px).
- [ ] Public Comments and Internal Notes panels are visually distinct at every viewport, not just
  desktop.
- [ ] Role/status/priority badges consistent with Lab 2's badge system, text always present.
- [ ] Disabled Administrator safety buttons (self-deactivation, last-admin) show a tooltip, not
  just a disabled cursor, at touch-only (no-hover) viewports.

## 5. Test Commands
- Server: `cd server && npm test`
- Client: `cd client && npm test`
- E2E: `cd e2e && npx playwright test`

## 6. Final Results
Recorded during Task 34, run from a clean seeded state on branch `feature/9e-lab3-e2e-final`
(base `lab3-staging`, with `feature/9a`-`9d` already merged in).

### `cd server && npm test`
32 test files, 176 tests, all passed. Includes every `tests/lab-01/`, `tests/lab-02/`, and
`tests/lab-03/` file — the Lab 1/Lab 2 regression subset passed unmodified (REG-01).

### `cd client && npm test`
11 test files, 31 tests: 10 files / 30 tests passed. One pre-existing failure,
`tests/lab-01/App.test.tsx`, unrelated to any Lab 3 change: `localStorage.clear()` throws
`Cannot read properties of undefined (reading 'clear')` in this project's jsdom test
environment. Confirmed present on a clean `origin/lab3-staging` checkout before any Lab 3
E2E/final-integration work touched the client — a pre-existing Lab 1 test-environment gap,
not a regression introduced by Lab 3. Left unfixed as out of this plan's scope; whoever
owns the vitest/jsdom setup should investigate separately.

A real regression was found and fixed during this task: `tests/lab-02/MyTickets.test.tsx`
still mocked the pre-Lab-3 unversioned `/api/tickets` endpoint. The component itself was
already correctly fixed to call `/api/v1/tickets` during the #35 PR review, but the test's
mocks were never updated to match, so both `MyTickets` tests silently broke. Fixed by
updating the mock keys to `/api/v1/tickets`.

### `cd e2e && npx playwright test`
28 tests, all passed, across `e2e/lab-02/` and `e2e/lab-03/` (no `e2e/lab-01/` specs exist).

Two real, previously-undetected bugs were found and fixed while getting this suite green —
neither is Tasks 30-34's own code, both are bugs in already-merged Lab 3 subsystem PRs that
no test had exercised through a real browser before:
- **CORS misconfiguration** (`server/src/app.ts`): `app.use(cors())` used the default
  wildcard origin, which is incompatible with the cookie-based `credentials: "include"`
  requests the Lab 3 client makes — browsers refuse to store/send a credentialed cookie
  against a wildcard-origin response. Fixed to echo `CLIENT_URL` with
  `credentials: true`. This blocked every Lab 3 E2E login; it never surfaced in the
  server/client unit suites because neither goes through actual browser CORS enforcement.
- **Mobile table CSS bug** (`client/src/theme/zen-green.css`): the mobile breakpoint's
  `.zg-table, .zg-table thead { display: none; }` hid the entire table, not just its
  header, so the "one card per ticket" mobile layout ui-spec.md §3 describes was
  completely invisible below 768px on every screen using this table. Fixed to
  `.zg-table thead { display: none; }` only.

Also fixed for repeatability against the shared, persistent dev database: `server/prisma/
seed.ts`'s upsert didn't reset `passwordHash` on re-seed, so `onboarding@toktickit.local`'s
seeded password went stale after its own mandatory-first-login E2E spec changed it; several
E2E specs raced a direct `page.goto()` against the async login response instead of waiting
for a post-login element first; and `lab-02/requester-ticket-flow.spec.ts` /
`lab-02/visual-check.spec.ts` were ported from the removed Development Requester selector
to real login, since Lab 3 deleted that UI entirely (ui-spec.md: "The Development Requester
display and 'Change Requester' action are removed entirely").
