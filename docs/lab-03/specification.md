# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal
Replace the Lab 2 Development Requester selector with real session-cookie authentication and
role-based authorization, and ship the first operational IT Staff Ticket Queue/Detail workflow
plus a minimalist Administrator User Management screen, while every Lab 2 Requester function
keeps working unchanged under the authenticated identity.

## 2. Stakeholder Request Interpretation
The system now needs real users instead of a development stand-in. Administrators need a simple
screen to create/edit/activate/deactivate accounts and issue initial passwords. A user signing in
with an initial password must change it before doing anything else. Requesters keep using their
Lab 2 ticket functions, but ownership now comes from the authenticated session, not a client-sent
id. IT Staff need a queue to find work, claim/reassign tickets, set IT Priority, talk to the
Requester via Public Comments, keep private Internal Notes, and drive the ticket through its
permitted status workflow. Every protected operation is enforced server-side — a hidden button is
feedback, not security.

## 3. Scope
### Included
Email/password login, logout, current-user retrieval, mandatory first-login password change;
server-side role-based authorization for Requester/IT Staff/Administrator; migration from the Lab
2 Development Requester identity to the real `User` model; continued Requester ticket/attachment
ownership protection; IT Staff Ticket Queue (search/filter/sort/pagination) and Ticket Detail
(ownership, IT Priority, status workflow, Public Comments, Internal Notes, read-only Attachments);
Requester Public Comments plus "Problem Appears Resolved"; minimalist Administrator User
Management (list/search/role-filter, create, edit, activate/deactivate, set new initial password).

### Excluded
Email invitations, password-reset email, MFA, social login, SSO; self-registration; Actions Taken;
SLA calculation, escalation rules, notification services; dashboards/KPI analytics beyond simple
queue counts; multi-tenant organizations/departments; production-grade deployment changes;
multiple roles per user; user deletion, bulk operations, import/export, account-history screens;
department/organization/profile-photo user-profile fields; account unlocking, administrator
approval workflows; pagination, multi-column sorting, or multiple simultaneous filters on the
Administrator user list.

## 4. Functional Requirements
FR-01 System shall authenticate a user by email and password and issue an httpOnly session cookie
on success.
FR-02 System shall reject login for an inactive user with a safe, non-enumerating error.
FR-03 System shall provide a logout action that revokes the current session server-side.
FR-04 System shall expose the current authenticated user's identity and role via GET /api/v1/me.
FR-05 System shall force a user with `mustChangePassword=true` through a Change Password screen
before any other authenticated screen is reachable.
FR-06 System shall re-check `isActive` and `mustChangePassword` live against the database on
every authenticated request, never from a cached login-time value.
FR-07 System shall determine Requester ownership on every Requester ticket/attachment operation
from the authenticated session, never from a client-supplied id.
FR-08 System shall continue to serve all Lab 2 Requester Ticket and Attachment endpoints unchanged
in shape, now authenticated by session instead of the Lab 2 dev header.
FR-09 System shall remove the Development Requester selector and Change Requester action from the
client entirely.
FR-10 System shall let a Requester post a Public Comment on a Ticket they own.
FR-11 System shall let a Requester mark a Ticket "Problem Appears Resolved" without changing its
formal status.
FR-12 System shall let IT Staff retrieve a Ticket Queue with search, filters, sorting, and
pagination across all Tickets regardless of owner.
FR-13 System shall let IT Staff claim an unassigned Ticket or reassign an already-owned Ticket to
another active IT Staff/Administrator user.
FR-14 System shall let IT Staff/Administrator set IT Priority independently of Requested Priority.
FR-15 System shall let IT Staff perform only the status transitions permitted by the transition
matrix in §9 below.
FR-16 System shall let IT Staff post Public Comments and Internal Notes on any Ticket.
FR-17 System shall reject any Internal Note read/write attempt from a Requester without exposing
note content or existence.
FR-18 System shall let IT Staff view a Ticket's existing Attachments read-only; no staff upload or
removal endpoint exists in Lab 3.
FR-19 System shall let an Administrator list users with search by name/email and an optional role
filter.
FR-20 System shall let an Administrator create a user with name, email, one role, activation
state, and an initial password.
FR-21 System shall let an Administrator edit a user's name, email, role, and activation state.
FR-22 System shall let an Administrator set a new initial password that forces
`mustChangePassword=true` at the user's next login.
FR-23 System shall reject Administrator user creation/edit on a duplicate email address.
FR-24 System shall prevent an Administrator from deactivating their own account.
FR-25 System shall prevent the system from ever having zero active Administrators.
FR-26 System shall reject every protected endpoint request from an unauthenticated caller with 401
and from an authenticated-but-unauthorized caller with 403, without leaking whether the target
resource exists.

## 5. Business Rules
BR-01 Only an active user with valid credentials may authenticate; an inactive user's credentials
are rejected with the same generic message used for a wrong password.
BR-02 A user with `mustChangePassword=true` cannot reach any screen or API beyond
login/me/change-password until a new valid password is saved (FR-05).
BR-03 The authenticated user identity, not a `requesterId`/`ownerId`/`authorId` supplied by the
client, determines ownership of every Requester, IT Staff, and Administrator write.
BR-04 Public Comments are visible to the Requester, IT Staff, and Administrator. Internal Notes
are visible only to IT Staff and Administrator; there is no shared table or flag between the two,
so a Requester-facing query structurally cannot leak Internal Note content.
BR-05 A Requester may mark a Ticket "Problem Appears Resolved" (a separate boolean/flag, FR-11)
but cannot set Current Status to Resolved or Closed; only IT Staff/Administrator can.
BR-06 Login attempts are not rate-limited or lockout-tracked in Lab 3 (excluded scope); every
failed attempt returns the same generic 401 `INVALID_CREDENTIALS` regardless of whether the email
exists.
BR-07 Passwords are hashed with bcrypt (cost factor 10) and are never logged, returned in any API
response, or stored in plaintext anywhere, including seed fixtures documented as local-dev-only.
BR-08 A new/reset password must satisfy: minimum 8 characters, at least one uppercase, one
lowercase, one digit, one special character; login itself is exempt (it only verifies an existing
hash against this policy's product, not the input).
BR-09 Session tokens are opaque, stored server-side as a SHA-256 hash (`Session.tokenHash`), carry
a fixed 12-hour lifetime not renewed on activity, and are set httpOnly + SameSite=Lax (Secure in
production only).
BR-10 Logout revokes the current session row (`revokedAt` set); a revoked or expired session is
treated identically to no session (401).
BR-11 `isActive` and `mustChangePassword` are read fresh from the database on every request; a
session issued while a user was active remains subject to later deactivation taking effect
immediately on the next request.
BR-12 A duplicate email address is rejected at both user creation and edit with 409
`EMAIL_ALREADY_EXISTS`; email comparison is case-insensitive.
BR-13 The current-user endpoint (GET /api/v1/me) never returns `passwordHash` or any other
credential material.
BR-14 Each Ticket has at most one primary Ticket Owner, who must be an active IT Staff or
Administrator user at the moment of assignment; a Ticket may remain unassigned indefinitely.
BR-15 A Ticket's first ownership assignment is the only path from `NEW` to `OPEN`; `NEW` is never
a direct `PATCH .../status` target.
BR-16 IT Staff assignment (claim/reassign) is available to any active IT Staff or Administrator
user for any Ticket; there is no per-category or per-team restriction in Lab 3.
BR-17 Requested Priority is immutable after creation (set once by the Requester at creation, per
Lab 2). IT Priority initially copies Requested Priority and can thereafter be changed only by IT
Staff or Administrator.
BR-18 A ticket locked in a terminal status (`CLOSED`, `CANCELLED`) rejects every owner/priority/
status mutation with 409 `TICKET_LOCKED` except the single permitted `CLOSED → REOPENED`
transition.
BR-19 Only the 8 statuses NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED,
REOPENED, CANCELLED exist; only the transitions in the matrix in §9 are valid — any other
requested transition returns 409 `INVALID_STATUS_TRANSITION`.
BR-20 Public Comments and Internal Notes are append-only in Lab 3: no edit or delete endpoint
exists for either.
BR-21 Empty or whitespace-only Public Comment/Internal Note content is rejected with 422; content
is capped at 2000 characters.
BR-22 Every Public Comment/Internal Note record stores its author id and creation timestamp,
populated server-side from the authenticated session, never from the request body.
BR-23 A Requester requesting another Requester's Ticket, Attachment, or Comment resource receives
404, never 403, so the response never confirms the resource exists (unchanged from Lab 2, BR-18).
A Requester requesting any Internal Note endpoint receives 403 with no note content in the body
(FR-17).
BR-24 Failures distinguish 401 (unauthenticated), 403 (authenticated, forbidden by role), 404
(not found/not owned), 409 (conflict — duplicate email, locked ticket, invalid transition), 422
(validation), and 500 (unexpected) — no response body for any of these leaks stack traces or
internal identifiers.
BR-25 The IT Staff Ticket Queue defaults to Created Date descending, page size 20, capped at 50; an
invalid/out-of-range page, pageSize, or sort parameter falls back to the default rather than
erroring (mirrors Lab 2 BR-20).
BR-26 Every Lab 2 Requester Ticket/Attachment business rule (BR-01 through BR-25 in
docs/lab-02/specification.md) continues to hold unchanged; this spec only adds authentication,
authorization, IT Staff, and Administrator rules on top.
BR-27 The existing Lab 2 `x-dev-requester-id` header and its middleware are removed entirely; no
route accepts it, even as a fallback, once this sprint ships.
BR-28 Administrator user management is limited to: creating a user with one permitted role;
updating name, email, role, and activation state; preventing duplicate email addresses; setting a
new initial password that forces a change at next login; preventing an Administrator from
deactivating their own account; preventing removal or deactivation of the last active
Administrator; using deactivation instead of deletion (no delete endpoint exists).
BR-29 An Administrator cannot deactivate their own account, enforced server-side even if the
request is crafted directly against the API (409 `SELF_DEACTIVATION_BLOCKED`).
BR-30 An edit or deactivation that would leave zero active Administrators is rejected with 409
`LAST_ADMIN_PROTECTED`, checked at write time against the live database count, not a cached value.

## 6. UI Specification Summary
See ui-spec.md for the full screen-by-screen breakdown. Summary: the application shell replaces
the Development Requester display with the authenticated user's name/role and a Logout action;
navigation is role-scoped (a Requester never sees Staff/Admin destinations even as disabled links);
Login and mandatory Change Password are two states of one flow; Requester Ticket Detail gains a
Public Comments panel and a "Problem Appears Resolved" action; the Staff Ticket Queue is a
desktop table / mobile card list with search, filters, sort, pagination; Staff Ticket Detail
extends the Lab 2 read-only layout with editable Ticket Owner/IT Priority/Status controls plus
visually distinct Public Comments and Internal Notes tabs; Administrator User Management is one
list+drawer screen with no pagination/multi-sort per the sheet's explicit exclusion.

## 7. Data Changes
Current state (verified against `server/prisma/schema.prisma` as of this sprint's start):
`TicketStatus` has only the single value `NEW`; there is no `User`, `Session`, `Comment`, or
`InternalNote` model; ownership lives on a standalone `Requester` model keyed by the Lab 2
`x-dev-requester-id` header. Lab 2 never shipped Public Comments — the old reference plan assumed a
prior rename/prior Comment model that do not exist in this repo, so both are corrected here.

New models: `User` (id, email unique, passwordHash, displayName, role enum
[REQUESTER,IT_STAFF,ADMINISTRATOR], isActive, mustChangePassword Boolean @default(false),
createdAt), `Session` (userId, tokenHash unique, expiresAt, revokedAt, indexed on userId),
`Comment` (ticketId, authorId, authorRole, body VarChar(2000), indexed on [ticketId, createdAt]),
`InternalNote` (ticketId, authorId, body VarChar(2000), indexed on [ticketId, createdAt]).

`TicketStatus` enum: since only `NEW` exists today, the remaining 7 values (`OPEN`,
`IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`) are added
fresh via `ALTER TYPE "TicketStatus" ADD VALUE` — there is nothing to rename. `Ticket` gains
`ownerId Int? @relation(...)` (nullable — a Ticket may be unassigned), `itPriority` already exists
and becomes independently editable post-creation, and a new
`resolvedIndicatedByRequester Boolean @default(false)` column backs FR-11/BR-05.

Migration: the Lab 2 `Requester` rows become the seed source for `User` rows with role=REQUESTER,
inserted via a seed upsert keyed on email; existing `Requester` ids are preserved as the new
`User` ids so `Ticket.requesterId` foreign keys never change (requires either reusing the same
autoincrement id sequence or an explicit id-preserving insert — decided per Task 1 of the
implementation plan). The `Requester` model itself is dropped once `User` fully replaces it, in
the same migration that adds the new `User`-referencing foreign keys. Every seeded user shares one
local-dev password (`DevPass123!`, bcrypt-hashed); one dedicated fixture
(`onboarding@toktickit.local`) ships with `mustChangePassword=true` to exercise the first-login
flow. The Development Requester selector's client-side storage is deleted, not migrated — it
carried no server state.

## 8. API Contract
See api-spec.md for the full endpoint table, request/response DTOs, and status codes. Summary of
new route namespaces, each gated by `requireRole(...)` reading the session-resolved user:
`/api/v1/auth/*` (login, logout, change-password — unauthenticated except change-password),
`/api/v1/me` (any authenticated role), `/api/v1/tickets/*` (Requester, unchanged Lab 2 shape),
`/api/v1/staff/tickets/*` + `/api/v1/staff/assignable-owners` (IT Staff, Administrator),
`/api/v1/admin/users/*` (Administrator only).

## 9. Ticket Status Transition Matrix
| From | To | Trigger |
|---|---|---|
| NEW | OPEN | automatic, on first ownership assignment (BR-15) — never a direct PATCH target |
| NEW | CANCELLED | IT Staff/Administrator |
| OPEN | IN_PROGRESS | IT Staff/Administrator |
| OPEN | WAITING_FOR_REQUESTER | IT Staff/Administrator |
| OPEN | CANCELLED | IT Staff/Administrator |
| IN_PROGRESS | WAITING_FOR_REQUESTER | IT Staff/Administrator |
| IN_PROGRESS | RESOLVED | IT Staff/Administrator |
| WAITING_FOR_REQUESTER | IN_PROGRESS | IT Staff/Administrator |
| WAITING_FOR_REQUESTER | RESOLVED | IT Staff/Administrator |
| WAITING_FOR_REQUESTER | CANCELLED | IT Staff/Administrator |
| RESOLVED | CLOSED | IT Staff/Administrator |
| RESOLVED | REOPENED | IT Staff/Administrator |
| CLOSED | REOPENED | IT Staff/Administrator |
| REOPENED | OPEN | automatic, mirrors NEW→OPEN on next assignment |
Any transition not listed above returns 409 `INVALID_STATUS_TRANSITION`; any transition attempted
from `CLOSED` other than `REOPENED`, or from `CANCELLED` at all, returns 409 `TICKET_LOCKED`.

## 10. Acceptance Criteria
AC-01 Given an active user with valid credentials, when the user logs in, then the backend
establishes authenticated access and returns the permitted user identity and role.
AC-02 Given a user who must change the initial password, when login succeeds, then normal
application screens remain unavailable until a valid new password is saved.
AC-03 Given an authenticated Requester, when the client supplies another requesterId, then the
backend still applies the authenticated identity and does not return another Requester's data.
AC-04 Given a Requester account, when an Internal Note endpoint is requested, then the operation
is rejected without exposing note content.
AC-05 Given an inactive user's valid password, when login is attempted, then the API returns 403
`ACCOUNT_DEACTIVATED` and no session cookie is set.
AC-06 Given an unknown email or wrong password, when login is attempted, then the API returns 401
`INVALID_CREDENTIALS` with an identical message in both cases.
AC-07 Given an authenticated session, when logout is called, then a subsequent request with the
same cookie returns 401.
AC-08 Given a Requester's own Ticket, when the Requester posts a Public Comment, then it appears
with the author's display name and role, visible to IT Staff on the same Ticket.
AC-09 Given a Ticket owned by another Requester, when a Requester requests it directly by id, then
the API returns 404.
AC-10 Given an unassigned Ticket, when IT Staff claims it, then Current Status auto-transitions
NEW→OPEN and Ticket Owner is set to the claiming user.
AC-11 Given a Ticket in CLOSED status, when IT Staff attempts any status change other than
REOPENED, then the API returns 409 `TICKET_LOCKED`.
AC-12 Given IT Priority is changed by IT Staff, then Requested Priority on the same Ticket remains
unchanged.
AC-13 Given an Internal Note is created by IT Staff, when a Requester later fetches the same
Ticket's comments, then the Internal Note never appears in that response.
AC-14 Given the Ticket Queue has more Tickets than one page, when IT Staff paginates, then results
are stable and consistently ordered by the default sort.
AC-15 Given an Administrator creates a user with a duplicate email, then the API returns 409
`EMAIL_ALREADY_EXISTS` and no new row is created.
AC-16 Given the last active Administrator, when that account attempts self-deactivation or another
Administrator attempts to deactivate it, then the API returns 409 and the account remains active.
AC-17 Given an Administrator sets a new initial password for a user, when that user next logs in
with it, then they are forced into the Change Password screen before reaching any other screen.
AC-18 Given a non-Administrator authenticated user, when any `/api/v1/admin/users*` endpoint is
requested, then the API returns 403 and no user list data is returned.
AC-19 Given a mobile viewport (<768px), when the Staff Ticket Queue or Admin User Management
screen renders, then no field is clipped and no horizontal scroll occurs.
AC-20 Given the backend is unreachable, when any Lab 3 screen loads/submits, then a safe generic
error state is shown, never a raw stack trace.

## 11. Definition of Done
- [x] Every AC above has at least one passing automated test, traced in tests.md (AC-01
  through AC-20, tests.md §3).
- [x] Every FR/BR above is implemented; any tracked gap is documented here, not silently
  dropped. One tracked gap: `tests/lab-01/App.test.tsx` fails in the client's jsdom test
  environment (`localStorage.clear()` throws) — confirmed pre-existing on a clean
  `lab3-staging` checkout before any Lab 3 work touched the client, so it is a Lab 1
  test-infrastructure gap, not an unmet Lab 3 FR/BR. See tests.md §6 for detail.
- [x] Unit, API, UI component, UI style/visual, responsive, authorization, migration/regression,
  and E2E tests all pass from the final branch (`feature/9e-lab3-e2e-final`, see tests.md §6).
- [x] No required test is skipped, disabled, or commented out.
- [x] docs/lab-01/ and docs/lab-02/ tests still pass unmodified, except the one pre-existing
  `App.test.tsx` gap noted above (present before Lab 3, not introduced by it).
- [x] README documents the seeded local-dev accounts and the mandatory-first-login fixture.
- [ ] All Lab 3 Issues merged into `lab3-staging` via peer-reviewed PRs, then into `main`.
  Issues #29-#32 are merged into `lab3-staging`; this issue (#33) is not yet merged as of
  this commit, and no PR from `lab3-staging` into `main` has been opened yet — that PR is
  explicitly gated on this issue closing first (see issue #33's own description). Owner:
  whoever merges the PR this branch is about to open.
- [x] Specification, ui-spec, api-spec, and tests docs all existed before implementation PRs
  merged (traceable via commit history).

## 12. Assumptions and Decisions
- Opaque server-side session tokens in httpOnly cookies (`ttk_session`), not JWTs — `Session`
  stores only a SHA-256 hash of the token, never the raw value.
- Fixed 12-hour session lifetime, not sliding/renewed on activity, to keep expiry reasoning simple
  for a local-lab course project.
- Three disjoint route namespaces gated by one shared `requireRole(...)` middleware, rather than a
  single router with a permissions matrix — matches the sheet's instruction that Administrator and
  IT Staff responsibilities stay conceptually separate.
- Internal Notes are a separate Prisma model with their own route surface, not a visibility flag on
  the existing Comment model, so a Requester-facing query can never leak them by a forgotten filter.
- `TicketStatus` values are added fresh (`ALTER TYPE ... ADD VALUE`), not renamed, because the
  current schema only defines `NEW` — every existing Lab 2 Ticket row keeps status `NEW` and
  survives the migration with zero data loss and no manual UPDATE.
- Public Comments are new in Lab 3, not a Lab 2 carryover — the earlier reference plan's assumption
  that a Comment model already existed was checked against `server/prisma/schema.prisma` and found
  incorrect; corrected here before planning.
- Administrator's "issue or reset an initial password" (sheet §6) is admin-chosen, not
  system-generated: the Administrator types the new initial password subject to the same policy as
  any other password set (BR-08), and it is never emailed (excluded scope).
- Every seeded account shares one local-dev password (`DevPass123!`); this is documented in README
  as local-dev-only and is not a real credential.
