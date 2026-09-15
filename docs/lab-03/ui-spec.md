# Lab 3 UI Specification — Zen Green Theme (extends docs/lab-02/ui-spec.md)

All Lab 2 tokens, typography, spacing, button hierarchy, field states, and accessibility rules
(docs/lab-02/ui-spec.md §"Color tokens" through "Accessibility") apply unchanged. This file covers
only what Lab 3 adds or changes.

## Application shell and navigation (replaces Lab 2's)
TokTickIT wordmark + role-scoped nav items + a "Profile" menu showing the authenticated user's
display name and role badge + Logout action. The Development Requester display and "Change
Requester" action are removed entirely. Nav items shown per role:
- Requester: My Tickets, Create Ticket.
- IT Staff: My Queue, Create Ticket (still usable as a Requester of their own IT requests).
- Administrator: Admin (User Management). Administrator does not see Staff Queue nav unless also
  granted IT Staff role (excluded — Lab 3 is single-role per user).
An unauthorized destination is never rendered, not merely disabled (server-side enforcement is
authoritative regardless; hiding it is UX polish only).

## 1. Login and Mandatory Password Change (sheet §8.1, p.8)
**Login (initial mode):** email field, password field (show/hide toggle), Sign In button, "Forgot
your password?" link rendered but disabled/inert in Lab 3 (excluded scope — no reset flow ships).
States: initial, validating (inline on blur), submitting (busy button, fields locked), failure
(red callout "Invalid email or password.") — identical wording whether the email is unknown or the
password is wrong (BR-06), inactive-account failure uses a distinct generic message that does not
say "this account is deactivated" verbatim if that would help enumerate accounts; a safe phrasing
such as "This account cannot sign in right now." is used instead, success (redirect into app or
into Change Password mode).

**Change Password (mandatory mode, shown instead of the app when `mustChangePassword=true`):**
Current (temporary) password field, New password field, Confirm new password field, live
policy-checklist (≥8 chars / upper+lower / digit+special — each item ticks green as satisfied),
Continue button. States: validating (checklist updates live), submitting, failure (422 field
errors, e.g. current password wrong or new password reused/policy-violating), success (clears
`mustChangePassword`, enters the normal app shell). This screen cannot be dismissed or navigated
away from — no back button, no nav rendered — while `mustChangePassword=true`.

## 2. Requester Ticket Detail — Public Comments addition (sheet §8.2)
Extends the Lab 2 read-only layout (docs/lab-02/ui-spec.md "Requester Ticket Detail read-only
layout") unchanged, plus:
- A "Problem Appears Resolved" button, visible only while status is not already Resolved/Closed/
  Cancelled; confirms via inline state change to "Marked as resolved by you" once clicked, never a
  browser `confirm()` dialog.
- A Public Comments panel below Attachments: existing comments listed oldest-first, each showing
  author display name + a role tag ("Requester"/"IT Staff"/"Administrator") + timestamp; a text
  area + "Post Comment" button at the bottom. Empty state: "No comments yet."

## 3. IT Staff Ticket Queue (sheet §8.3, p.8 screenshot)
Desktop table columns: Ticket No., Created Date, Summary, Category, Req. Priority, IT Priority,
Status, Owner (or "Unassigned" in muted text). Search box ("Search by ticket number or summary…")
+ a "Filters" control (Status, Owner incl. Unassigned, IT Priority) + column-header sort on
Created Date/Last Updated + pagination ("Showing X to Y of Z tickets", Previous/Next + page
numbers) — mirrors Lab 2's My Tickets control layout exactly, same component reused. Mobile: one
card per ticket, Ticket No. and Summary most prominent, Status/Priority badges stacked below.
States: loading, empty (zero tickets exist — rare, shown only pre-seed), no-results (filters
active, zero matches, "Clear Filters" action), forbidden (non-staff role — never reachable via nav,
but a direct-URL attempt shows a safe "You don't have access to this page" state), failure.

## 4. IT Staff Ticket Detail (sheet §8.4, p.9 screenshot)
Extends the Lab 2 read-only Ticket Detail layout with these fields now editable, visually distinct
(white bg + border, per Lab 2's "Editable field" token) from the still-read-only fields (Ticket
No., Category, Related System, Requester, Requested Priority, Summary, Description):
- **Ticket Owner** — a select populated from `GET /staff/assignable-owners`, includes a "Claim for
  myself" shortcut option at the top when unassigned or owned by someone else.
- **IT Priority** — a select (Low/Medium/High/Urgent), independent of the read-only Requested
  Priority shown beside it.
- **Current Status** — a select constrained client-side to only the transitions valid from the
  current status per specification.md §9 (the server is authoritative regardless; the client list
  is UX guidance, not the security boundary).
Below the field groups, four tabs: **Public Comments** (shared, green-tinted panel border),
**Internal Notes** (staff-only, amber-tinted panel border and an "Internal — not visible to
Requester" label directly above the entry box, so private content is never mistaken for public),
**Attachments** (read-only list, download action only — no upload/remove control renders here),
**Resolution indication** (a read-only badge if the Requester has marked "Problem Appears
Resolved," e.g. "Requester indicated this is resolved on {date}"). States: loading, saving (busy
per-field on Owner/Priority/Status change), success (inline confirmation, no full-page reload),
validation (422 on comment/note post), conflict (409 `TICKET_LOCKED`/`INVALID_STATUS_TRANSITION`
shown as an inline callout, the attempted change reverts to the last known-good value), forbidden,
failure.

## 5. Administrator User Management (sheet §8.5, p.10-12 screenshot)
One screen, list + slide-over drawer (no separate route for create vs. edit):
- **List:** Name, Email, Role (badge), Status (Active/Inactive badge), Edit action. Search box
  ("Search users…") + role filter select ("Filters"). No pagination, no multi-column sort, no
  bulk-select — explicitly excluded (sheet §8.5 "not required" list).
- **Create User drawer:** Full Name, Email Address, Role select, Active toggle (default on),
  Initial Password field (admin-typed, same policy checklist as Change Password) + "Save User".
- **Edit User drawer:** same fields except password; a separate "Set New Password" sub-action
  reveals its own password + confirm fields inline rather than a second modal. A "Deactivate
  User"/"Activate User" button (label reflects current state) sits at the bottom, styled
  destructive-outline when it would deactivate. Disabled with a tooltip ("Cannot deactivate your
  own account" / "Cannot deactivate the last active Administrator") when BR-29/BR-30 would block it
  — the button is visibly present but inert, never hidden, so the Administrator understands why.
States: loading, validating, submitting, success (toast + drawer closes + list refreshes),
conflict (409 duplicate email / self-deactivation / last-admin — inline error, drawer stays open),
forbidden (non-Administrator — same pattern as Staff Queue's forbidden state), empty (zero users —
never true post-seed, still implemented), no-results (search/filter match nothing).

## Badges (new)
Role badge: Requester (gray), IT Staff (blue-green), Administrator (dark green) — reuses the
`zg-badge` base class family from Lab 2's `zen-green.css`, new `zg-role-badge-*` modifiers.
Status badge gains a `zg-status-badge-reopened` variant (amber, distinct from the existing New/
Open/In Progress/Waiting/Resolved/Closed/Cancelled variants).

## Screenshot paths (Task 35 saves into these)
artifacts/lab-03/screenshots/authentication/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/staff-queue/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/staff-ticket-detail/{desktop,tablet,mobile}.png
artifacts/lab-03/screenshots/user-management/{desktop,tablet,mobile}.png
