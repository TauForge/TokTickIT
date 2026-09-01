# Lab 2 UI Specification — Zen Green Theme

## Color tokens (from labsheet §7, verbatim)
| Token | Value | Use |
|---|---|---|
| Primary green | #006B3C | App header, primary actions, strong emphasis |
| Secondary green | #0B7A46 | Active tabs, focus accents, links, hover states |
| Pale green | #EAF6EF | Selected / success / subtle section emphasis |
| Page background | #F5F7F6 | Page background |
| Surface/cards | #FFFFFF, subtle border + restrained shadow | Cards |
| Text | dark charcoal-green (#1F2E28), not pure black | Body text |
| Editable field | white bg, clear neutral border | Inputs |
| Read-only field | soft gray-green/warm ivory shading | Read-only display |
| Error | dark red text/border, message below field | Validation errors |
| Warning | amber callout/badge, not decorative | Warnings |
| Success | green confirmation, not color-only | Success states |

## Typography and spacing
Base font stack: system-ui. Page title 28px/700; section heading 18px/600; body 15px/400;
label 13px/600 uppercase-tracking-wide. Spacing scale: 4/8/12/16/24/32px. Card padding 16-24px.

## Field states
Editable: white bg, 1px neutral border, focus ring in secondary green (2px), 40px height.
Read-only: pale ivory/gray-green bg, no focus ring, cursor default.
Invalid: red border + red text below field (asterisk alone never substitutes for the message).
Disabled: 50% opacity, not-allowed cursor, no hover state.
Required-field marker: red asterisk immediately after the label text.

## Button hierarchy
Primary: solid primary green bg, white text. Secondary: white bg, secondary-green border/text.
Tertiary: text-only, secondary-green. Destructive (remove attachment): white bg, dark-red
border/text. Busy: spinner + disabled state, label unchanged (no layout shift).

## Attachment states
Uploading: progress indicator, cancel disabled until settled. Active: filename + size + download
action. Invalid (rejected client-side before upload): red inline message, file not added to list.
Removed: filename + size + "Removed  — " in muted text, no download action.

## Initial / loading / validation / submitting / success / failure states
Every form (Create Ticket, Development Requester Selector) implements: initial (empty, ready),
loading (reference data fetching — categories/related systems/requesters), validating (inline,
on blur and on submit), submitting (busy button, fields locked), success (confirmation +
generated Ticket Number / navigation), failure (safe generic message, entered values retained).

## Desktop / tablet / mobile layout rules
| Viewport | Rule |
|---|---|
| Desktop >=992px | Multi-column layout, content centered, max-width ~1100px |
| Tablet 768-991px | Two-column where practical; Summary/Description get full width |
| Mobile <768px | Fields stack vertically; buttons touch-friendly (min 44px height); no horizontal scroll |
| All sizes | No clipped labels, overlapping messages, hidden buttons, or unreadable attachment names |

## Accessibility
Every icon-only control has an aria-label and tooltip. Focus indicators remain visible for
keyboard users (never `outline: none` without a replacement). Labels are programmatically
associated with inputs (`htmlFor`/`id`). Status/priority badges never rely on color alone —
each carries visible text.

## Application shell and navigation
TokTickIT wordmark (primary green header) + "My Tickets" / "Create Ticket" nav items + current
Requester name + "Change Requester" action. Active nav item shown via secondary-green underline
plus bold weight (not color alone). Mobile: nav collapses to a labelled menu, no icon-only toggle
without an aria-label.

## My Tickets list: columns and mobile representation
Desktop table columns: Ticket No., Created Date, Summary, Category, Requested Priority,
IT Priority, Current Status, Last Updated. Mobile: one card per ticket showing the same fields
stacked, Ticket No. and Summary most prominent. Priority/Status render as PriorityBadge/StatusBadge.

## Search, filter, sort, pagination controls
Search box (Ticket Number or Summary) + Category/Requested Priority/IT Priority/Current Status
selects + a visible "Clear Filters" action + sort control (Created Date / Last Updated, asc/desc)
+ pagination (Previous/Next + page numbers + "Showing X to Y of Z tickets").

## Empty vs no-results
Empty (zero tickets ever): centered illustration-free message + "Create Ticket" CTA.
No-results (filters active, zero matches): message referencing active filters + "Clear Filters".

## Requester Ticket Detail read-only layout
Header field group (Ticket No., Created Date, Category, Related System) — read-only shading.
Status group (Requester, Requested Priority, IT Priority, Current Status) — read-only shading.
Summary/Description — full-width read-only text blocks. Attachments section is visually
separated (card boundary) from ticket fields, never implies Public Comments/Internal
Notes/Actions Taken exist.

## Screenshot paths (Task 23 saves into these)
artifacts/lab-02/screenshots/create-ticket/{desktop,tablet,mobile}.png
artifacts/lab-02/screenshots/my-tickets/{desktop,tablet,mobile}.png
artifacts/lab-02/screenshots/ticket-detail/{desktop,tablet,mobile}.png
