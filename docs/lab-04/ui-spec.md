# Lab 4 UI Specification: Zen Green (extends docs/lab-02 and docs/lab-03 ui-spec.md)

All Lab 2/3 tokens, typography, spacing, buttons, field states, badges, tabs, tables, cards and accessibility rules
apply unchanged. This file covers only what Lab 4 adds or changes.

## Application shell and navigation
- IT Staff and Administrator: **Dashboard** (first, default landing after login), My Queue, Create Ticket;
  Administrator also Admin.
- Requester: **Dashboard**, My Tickets, Create Ticket. Requester lands on Dashboard after login.
- The current page's nav item shows a filled underline and `aria-current="page"`; hover and focus states are
  distinct from the active state.
- Obsolete or duplicate controls left from earlier labs are removed (FR-24), for example any leftover Lab 2
  requester selector text or unused placeholder links.

## 1. IT Staff Dashboard
Greeting "Welcome back, {name}" and a Refresh button (re-fetches; disabled while loading).
Metric cards (label, large value, "View" action as a real link): New, Open, In Progress, Waiting for Requester,
My Assigned, Unassigned. A compact "By IT Priority" card with Low/Medium/High counts, each a link. Lists:
"Urgent" (HIGH, oldest first), "Recently Updated", "My Recent Actions". Quick Actions: Create Ticket, Search
Tickets, My Queue. Administrator also sees a "Users" card (active, inactive, per role) linking to Admin.
Every card and row links as defined in specification.md 5.4.
Layout: cards in a responsive grid (5 across on desktop, 3 on tablet, 2 on mobile, then 1 below 360px); lists below;
no horizontal scroll at any width.
States: loading (skeleton cards, `aria-busy`), empty lists ("No tickets need attention."), zero counts show 0,
forbidden (non-staff direct URL: "You don't have access to this page."), safe failure (generic message + Retry).

## 2. Requester Dashboard
Greeting "Welcome, {name}". Cards: My Open, In Progress, Waiting for Me, Resolved, Closed, each with a "View all"
link into My Tickets with the matching status filter. Lists: "Recently Updated" and "Recently Resolved" (rows show
ticket number, summary, status badge, updated date). Quick Actions: Create Ticket, View My Tickets. A card with a
value above 0 for Waiting for Me is emphasized by a text label ("Needs your reply"), not color alone.
States as above; forbidden for staff roles; no data of other Requesters ever rendered.

## 3. Actions Taken on Staff Ticket Detail
New area "Actions Taken" below the field groups, as a fourth tab beside Public Comments, Internal Notes and
Attachments, shown with a count badge.
- **List mode:** table on desktop, one card per Action on mobile: Date/Time (Asia/Bangkok), Performed by, Result,
  Follow-up badge ("Follow-up needed" text badge when required), Description (truncated with expand), Attachment
  notes. Ordered by action date/time then id. Empty: "No actions recorded yet."
- **Create mode:** "Add Action" button opens an inline form: Action Date/Time (default now), Description, Result,
  Follow-up required checkbox, Follow-up note (appears and becomes required when the box is checked), Attachment
  notes. Performed by is shown read-only ("You"). Submit locks while in flight; a retry reuses the same
  idempotency key.
- **View/edit mode:** selecting a row shows details; "Edit" is enabled only for the performer or an Administrator,
  otherwise it is visibly disabled with the tooltip "Only the person who recorded this action or an Administrator
  can edit it." Save sends `expectedVersion`; a stale result shows an inline callout "Someone changed this. Reload
  to see the latest." with a Reload action. Reload resets the form to the latest saved values (so Save can never replace
  someone else's edit unseen) and keeps what the user had typed in a visible "unsaved text" list. Edit sends `actionAt`
  only when that field was changed. Owner, priority and status controls are disabled while one of those writes is in flight.
- No delete control exists anywhere.
- Validation errors appear under the field and in a summary linked to the first error; entered data is kept.
Requester Ticket Detail gets the same list read-only (no Add, no Edit), titled "Actions Taken".

## 4. Ticket workflow feedback
The Current Status select offers only the permitted next statuses from specification 5.2. Choosing Resolved on a
Ticket with no Actions shows the inline callout "Record at least one action before resolving." and the select reverts.
Success refreshes the Ticket summary status badge and version without a full reload. 409 conflicts (stale, locked,
invalid transition) show an inline callout and revert the control to the last known value.

## Metric card and badge conventions
Metric card: white surface, 1px border, label (14px), value (32px bold), link row. Link text is always a real
`<a>` with an accessible name that includes the metric ("View In Progress tickets"). Status, priority and
follow-up are always text plus color. Private Internal Notes stay amber-bordered; Public Comments and Actions Taken
are green-bordered or neutral, never amber.

## Responsive and accessibility rules (same as Lab 2/3, plus)
Breakpoints 390 / 820 / 1280. Visible focus ring on every interactive element; logical tab order; labels tied to
inputs; `aria-live` region announces save success and errors; modal-free design (no inaccessible dialogs); touch
targets at least 44px; no horizontal page scroll; contrast at least 4.5:1.

## Visual and accessibility checklist (completed in tests.md section 4 after screenshots)
- [x] Theme tokens and badge system match Lab 2/3 on both dashboards and the Actions Taken area
- [x] Role navigation correct for Requester, IT Staff, Administrator; active page indicated
- [x] Editable vs read-only fields visually distinct
- [ ] Validation messages placed under fields and summarized
- [ ] Keyboard focus visible and logical on cards, forms, tabs
- [x] No clipped text, overlapping controls or hidden buttons at 390/820/1280
- [x] No horizontal overflow at 390
- [x] Status never conveyed by color alone

## Screenshot paths
artifacts/lab-04/screenshots/staff-dashboard/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/requester-dashboard/{desktop,tablet,mobile}.png
artifacts/lab-04/screenshots/actions-taken/{desktop,tablet,mobile}.png
