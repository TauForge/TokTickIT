# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a Requester-facing ticketing MVP: a Development Requester selector (testing-only
identity), Create Ticket, My Tickets (search/filter/sort/pagination), Ticket Detail (read-only),
and Attachment management (add/download/soft-remove), all in the Zen Green theme.

## 2. Stakeholder Request Interpretation
The IT department wants a professional Requester-facing ticketing experience before Requesters
can be trusted with real accounts. Since login ships in Lab 3, Lab 2 substitutes a Development
Requester selector so multi-user ownership can be tested now.

## 3. Scope
### Included
Development Requester selection and switching; Create Ticket; My Tickets list with search,
filter, sort, pagination; Requester Ticket Detail (read-only); attachment add/download/soft-remove;
Zen Green theme and responsive layout for all four screens.
### Excluded
Real authentication/sessions/passwords; IT Staff dashboard or any IT-Priority-setting UI; ticket
status changes beyond the initial New; Public Comments, Internal Notes, Actions Taken; free-text
search beyond Ticket Number/Summary; Administrator functions.

## 4. Functional Requirements
FR-01 System shall provide a Development Requester Selection screen listing active Requesters.
FR-02 System shall let the user select one Requester as the current session identity.
FR-03 System shall persist the selected Requester in browser storage across reloads.
FR-04 System shall provide a "Change Requester" action from the application shell.
FR-05 System shall reload requester-scoped data whenever the selection changes.
FR-06 System shall let a Requester create a Ticket with Category, Requested Priority, Summary,
Description, and optional Related System.
FR-07 System shall generate a unique, backend-generated Ticket Number for every created Ticket.
FR-08 System shall set a new Ticket's Current Status to New.
FR-09 System shall set a new Ticket's IT Priority equal to Requested Priority at creation.
FR-10 System shall set the Ticket's Requester to the currently selected Development Requester.
FR-11 System shall reject ticket creation with field-level errors when required fields are
missing/invalid, retaining entered values.
FR-12 System shall let a Requester upload up to 5 active Attachments per Ticket.
FR-13 System shall restrict Attachments to JPG/JPEG/PNG/WEBP/PDF, 5 MB max per file.
FR-14 System shall let a Requester view a paginated list of their own Tickets (My Tickets).
FR-15 System shall let a Requester search their own Tickets by Ticket Number or Summary.
FR-16 System shall let a Requester filter their own Tickets by Category, Requested Priority,
IT Priority, and Current Status.
FR-17 System shall let a Requester sort their own Tickets by Created Date and Last Updated.
FR-18 System shall show an empty state (no Tickets at all) and a distinct no-results state
(filters match nothing).
FR-19 System shall let a Requester open a Ticket Detail screen for any Ticket they own.
FR-20 System shall return 404 (not 403) for any Ticket/Attachment a different Requester owns.
FR-21 System shall display all current Ticket fields as read-only on Ticket Detail.
FR-22 System shall let a Requester view Attachments (active and removed-with-metadata) on an
owned Ticket.
FR-23 System shall let a Requester download any active Attachment on an owned Ticket.
FR-24 System shall prevent download/preview of a soft-removed Attachment.
FR-25 System shall let a Requester add an Attachment to an existing owned Ticket, subject to the
5-active-attachment cap.
FR-26 System shall let a Requester soft-remove one of their own Attachments with a required reason.
FR-27 System shall retain a soft-removed Attachment's metadata, visible on Ticket Detail.
FR-28 System shall disable/busy the Create Ticket submit button while in flight.
FR-29 System shall show a safe generic error state (never a raw stack trace) on backend failure.
FR-30 System shall render every Lab 2 screen per ui-spec.md's Zen Green tokens and responsive rules.

## 5. Business Rules
BR-01 The Ticket Number is backend-generated via an atomic per-year counter, format
TKT-YYYY-NNNNNN, never count(*)+1.
BR-02 A new Ticket always begins with Current Status = New.
BR-03 Lab 2 uses a Development Requester selector instead of real login; it carries no
password/session/authorization semantics.
BR-04 IT Priority is always system-copied from Requested Priority at creation; never accepted
from the request body; no separate entry UI exists in Lab 2.
BR-05 requesterId on a Ticket/Attachment write is always the currently selected Development
Requester's id; never accepted from a request body.
BR-06 A Category/Related System must be active to be selectable at creation time; existing
Tickets keep referencing a since-deactivated one without error.
BR-07 An inactive Development Requester must not appear in the selector.
BR-08 Ticket Summary is required, 5-150 characters after trimming.
BR-09 Ticket Description is required, 10-5000 characters after trimming.
BR-10 Category is required; Related System is optional.
BR-11 Requested Priority is required: Low, Medium, or High.
BR-12 Attachment type restricted to JPG, JPEG, PNG, WEBP, PDF (extension AND MIME type checked).
BR-13 Attachment size capped at 5 MB per file.
BR-14 A Ticket may have at most 5 active Attachments; the 6th upload attempt returns 409.
BR-15 Attachment removal is soft-delete only: metadata retained, file never deleted from
storage, never downloadable/previewable again.
BR-16 Removing an Attachment requires a non-empty removal reason.
BR-17 If a Ticket is created but a subsequent attachment upload fails, the Ticket is retained;
the user is shown which file(s) failed and may retry the upload against the created Ticket.
BR-18 A Requester may only view/search/filter/open their own Tickets; any request for another
Requester's Ticket/Attachment returns 404.
BR-19 My Tickets defaults to Created Date descending, page size 10, capped at 50.
BR-20 An invalid/out-of-range page, pageSize, or sort parameter falls back to the default.
BR-21 createdAt/removedAt timestamps are sufficient audit evidence for Lab 2; no separate
audit-log entity is required.
BR-22 Ticket Number allocation and the Ticket insert happen inside one transaction so a failed
insert never consumes a ticket number.
BR-23 The selected Requester is sent as an x-dev-requester-id header on every requester-scoped
call; the backend independently re-validates it is an active Requester on every call.
BR-24 No Requester password, session, JWT, or cookie is created, stored, or checked in Lab 2.
BR-25 No IT Staff dashboard, ticket claiming, IT Priority editing, status transition, comment,
internal note, or Actions Taken feature exists in Lab 2.

## 6. UI Specification Summary
See ui-spec.md for the full Zen Green token set, component states, and responsive rules. Summary:
application shell with TokTickIT identity + active-page nav + current Requester display; Create
Ticket form with system-generated fields visually distinct from editable ones; My Tickets as a
desktop table / mobile card list with search, filters, sort, pagination; Ticket Detail as
read-only field groups plus an Attachments section with active/removed states.

## 7. Data Changes
New models: Requester, RelatedSystem, Ticket, Attachment, TicketCounter. Category gains `code`
and `isActive`. Requester/Category/RelatedSystem ids stay Int autoincrement (matches the
existing Category convention). Ticket/Attachment ids are UUID strings instead, because they are
exposed in URLs (`/api/tickets/:id`, `/api/attachments/:id`) and must not be sequentially
guessable, given the 404-not-403 ownership policy in §11 below — an autoincrement id here would
let one Requester enumerate another's ticket/attachment ids even though each individual lookup
still correctly 404s. Full schema in server/prisma/schema.prisma itself (Task 6); api-spec.md
covers the DTO/endpoint contract, not the Prisma model definitions.

## 8. API Contract
See api-spec.md for the full endpoint table, request/response DTOs, and status codes.

## 9. Acceptance Criteria
AC-01 Given valid ticket data and a selected Requester, when the Requester submits Create
Ticket, then one Ticket is saved with status New, itPriority=requestedPriority,
requesterId=selected Requester, and the response shows the generated Ticket Number.
AC-02 Given no Development Requester is selected, when the user opens My Tickets or Create
Ticket, then the Development Requester Selection screen is shown instead.
AC-03 Given Requester B is selected, when a request is made for a Ticket created by Requester A,
then the API returns 404 and no Ticket data is exposed.
AC-04 Given Create Ticket is submitted with a missing Summary, then a field-level error appears
under Summary, the API is not called, and other entered values are retained.
AC-05 Given a Ticket already has 5 active Attachments, when a 6th upload is attempted, then the
API returns 409 and the UI shows an "attachment limit reached" message.
AC-06 Given an Attachment has been soft-removed, when its download URL is requested directly,
then the API returns 404 and no file bytes are returned.
AC-07 Given a Requester has zero Tickets, when they open My Tickets, then an empty-state message
is shown (not a blank table).
AC-08 Given a Requester has Tickets but the current filter matches none, when My Tickets
renders, then a no-results state (distinct from empty) is shown with a way to clear filters.
AC-09 Given two Requesters submit tickets concurrently in the same year, then both generated
numbers are unique and sequential with no gap or collision.
AC-10 Given the backend is unreachable, when Create Ticket/My Tickets/Ticket Detail
loads/submits, then a safe generic error state is shown and entered form values are preserved.
AC-11 Given a valid JPG under 5MB, when uploaded to an owned Ticket, then it appears active and
is downloadable.
AC-12 Given a .exe file, when upload is attempted, then the API rejects it (415) before any
file is stored.
AC-13 Given a file over 5MB, when upload is attempted, then the API rejects it (413) before any
file is stored.
AC-14 Given the active-Requester list is loading, when the Selector screen renders, then a
loading state is shown before the dropdown populates.
AC-15 Given the active-Requester API call fails, when the Selector renders, then a safe
API-failure state with retry is shown.
AC-16 Given My Tickets is sorted by Created Date descending at page size 10, when a Requester
with 15 Tickets opens My Tickets, then page 1 shows the 10 most recent and page 2 the remaining 5.
AC-17 Given a Requester removes their own Attachment with a reason, then it shows as removed
with metadata and reason still visible, and is not downloadable.
AC-18 Given a mobile viewport (<768px), when Create Ticket/My Tickets/Ticket Detail render,
then no field is clipped, no horizontal scroll occurs, and all controls remain reachable.
AC-19 Given a submit request is in flight, when the user double-clicks Submit on Create Ticket,
then only one Ticket is created.
AC-20 Given the Category dropdown loads only active Categories, when a Category is later
deactivated, then Tickets already referencing it still show that Category's name correctly.

## 10. Definition of Done
Walked task-by-task during Task 25 (final integration pass). Result per item:

- [x] Every AC above has at least one passing automated test. Cross-checked tests.md §3's
  traceability table against the actual test files on disk (not just trusted as written): every
  AC-01..AC-20 resolves to at least one real file under `server/tests/lab-02/`,
  `client/tests/lab-02/`, or `e2e/lab-02/`, and every one of those files is in the passing test
  run recorded in tests.md §6 (server 63/63, client 14/14, e2e 11/11). No AC is orphaned.
- [~] Every FR/BR above is implemented — **one tracked gap**: FR-30 ("System shall render every
  Lab 2 screen per ui-spec.md's Zen Green tokens and responsive rules") is only partially met.
  Task 22 applied the `--zg-*` CSS custom properties and several element-level rules (`body`,
  `dd`, `button[type=submit]`) globally, and the badge classes (`zg-badge`,
  `zg-priority-badge-*`, `zg-status-badge-*`) are wired into `client/src/components/badges.tsx`,
  and `zg-card` is wired into `CreateTicket.tsx`'s form — those render correctly. But
  `zen-green.css` also defines `.zg-app-header`, `.zg-table` (including its mobile
  card-collapse breakpoint), `.zg-empty-state`/`.zg-no-results-state`,
  `.zg-error-callout`/`.zg-success-callout`, `.zg-field-error`, and `.zg-readonly`/`.zg-card` on
  the other three screens — and grepping `client/src/` for these class names confirms none of
  them are actually applied in `App.tsx` (shell/header), `MyTickets.tsx` (table, empty/no-results
  states), `TicketDetail.tsx` (read-only fields, card), or `DevRequesterSelect.tsx` (card, error
  states). This was self-identified and explicitly deferred during Task 22's own code review
  (see `progress.md` "Task 22" entry) as outside that task's PATH-scoped file list, flagged for
  this final DoD check. Functionally harmless — no AC/test fails because of it, and the
  Playwright visual checks (VISUAL-01) don't assert on class names, only on layout/overflow — but
  it is a real, honest gap against FR-30's literal wording. All other FRs/BRs were spot-checked
  against their corresponding AC test evidence and are implemented.
- [x] Unit, API, UI component, UI style/visual, and E2E tests all pass. Run from branch
  `claude/vibrant-haibt-fdf325` rather than `lab2-staging` — this plan was executed with every
  task committed directly to one implementation branch instead of the brief's per-issue
  `feature/*` → `lab2-staging` branch/PR model (an explicit, controller-authorized deviation from
  early in this session; see the branching-model note in `progress.md`). No `lab2-staging` branch
  exists in this repo to run from. Full results in tests.md §6.
- [x] No required test is skipped, disabled, or commented out. Verified by grepping every
  `*.test.ts`/`*.test.tsx`/`*.spec.ts` file for `.skip(`, `.only(`, `xdescribe`, `xit(` — zero
  matches.
- [x] README/setup instructions for Lab 2 are current. Added a "Lab 2" section to the root
  `README.md` (`ATTACHMENT_STORAGE_DIR`, the one-time `toktickit_test` database setup, and how to
  run `e2e/`).
- [ ] All 8 Issues merged into lab2-staging via peer-reviewed PRs — **not done, and intentionally
  not attempted by this task.** No PR was ever opened or merged for any of the 8 Issues during
  this plan's execution (everything landed as direct commits to `claude/vibrant-haibt-fdf325`,
  per the branching-model deviation above). This checklist item, and opening/merging the actual
  PR(s) into `lab2-staging` and then `main`, remain manual, human-driven actions per this plan's
  own design (see task-25-brief.md's closing note) — Task 25 does not push or open a PR and
  cannot check this item off on the user's behalf.

## 11. Assumptions and Decisions
- Cross-owner access returns 404, not 403, to avoid confirming another Requester's Ticket exists.
- Identity is sent as an x-dev-requester-id header, never a body/query field, so Lab 3's real
  session header swap requires changing only the devRequester middleware.
- Ticket creation and attachment upload are two separate API calls (see BR-17).
- Requester/Category/RelatedSystem ids are Int autoincrement, matching Lab 1's existing
  Category convention. Ticket/Attachment ids are UUID strings (see §7) so URL-exposed ids are
  not sequentially guessable.
