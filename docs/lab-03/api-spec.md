# Lab 3 API Contract

All responses: `{ ...data }` on 2xx, `{ "error": { "code", "message", "fieldErrors": [] } }` on
non-2xx. All routes below except `/auth/login` require a valid `ttk_session` httpOnly cookie
(401 `UNAUTHENTICATED` if missing/invalid/expired/revoked). Role-gated routes additionally return
403 `FORBIDDEN_ROLE` for an authenticated user of the wrong role. A user with
`mustChangePassword=true` receives 403 `PASSWORD_CHANGE_REQUIRED` from every route except
`/auth/change-password`, `/auth/logout`, and `/me`.

## Auth (§1.1)
| # | Method & Path | Purpose | Auth | Success | Errors |
|---|---|---|---|---|---|
| 1 | POST /api/v1/auth/login | email+password login, issues session cookie | no | 200 LoginResponseDto | 401 INVALID_CREDENTIALS, 403 ACCOUNT_DEACTIVATED, 422 |
| 2 | POST /api/v1/auth/logout | revoke current session | yes | 200 {} | 401 |
| 3 | GET /api/v1/me | current user identity/role | yes | 200 MeDto | 401 |
| 4 | POST /api/v1/auth/change-password | set a new password, clears mustChangePassword | yes | 200 MeDto | 401, 422 INVALID_CURRENT_PASSWORD / field errors |

## Requester Tickets, Attachments, Comments (§1.2 — Tickets/Attachments unchanged from Lab 2 except
auth mechanism; Comments are new in Lab 3, there is no Lab 2 Comment model to migrate)
| # | Method & Path | Purpose | Auth | Success | Errors |
|---|---|---|---|---|---|
| 5 | POST /api/v1/tickets | create a ticket | Requester | 201 TicketDetailDto | 401,422 |
| 6 | GET /api/v1/tickets | list own tickets (paginated) | Requester | 200 TicketListDto | 401,400 |
| 7 | GET /api/v1/tickets/:id | one owned ticket | Requester | 200 TicketDetailDto | 401,404 |
| 8 | POST /api/v1/tickets/:id/attachments | upload attachment | Requester | 201 AttachmentDto | 401,404,409,413,415 |
| 9 | GET /api/v1/tickets/:id/attachments | list attachments | Requester | 200 AttachmentDto[] | 401,404 |
| 10 | GET /api/v1/attachments/:id/download | download active attachment | Requester | 200 file stream | 401,404 |
| 11 | DELETE /api/v1/attachments/:id | soft-remove (body: {reason}) | Requester | 200 AttachmentDto | 401,400,404 |
| 12 | PATCH /api/v1/tickets/:id/resolved-indication | mark "Problem Appears Resolved" | Requester (owner only) | 200 TicketDetailDto | 401,404,422 |
| 13 | GET /api/v1/tickets/:id/comments | list Public Comments (Requester view) | Requester (owner only) | 200 CommentDto[] | 401,404 |
| 14 | POST /api/v1/tickets/:id/comments | post a Public Comment | Requester (owner only) | 201 CommentDto | 401,404,422 |

## IT Staff Ticket Queue and Detail (§1.3)
| # | Method & Path | Purpose | Auth | Success | Errors |
|---|---|---|---|---|---|
| 15 | GET /api/v1/staff/tickets | queue: search/filter/sort/paginate all tickets | IT Staff, Administrator | 200 { data: StaffTicketListItemDto[], meta } | 401,403 |
| 16 | GET /api/v1/staff/assignable-owners | active IT Staff/Administrator users for the owner dropdown | IT Staff, Administrator | 200 UserSummaryDto[] | 401,403 |
| 17 | GET /api/v1/staff/tickets/:id | one ticket, staff view | IT Staff, Administrator | 200 StaffTicketDetailDto | 401,403,404 |
| 18 | PATCH /api/v1/staff/tickets/:id/owner | claim/assign/reassign | IT Staff, Administrator | 200 StaffTicketDetailDto | 401,403,404,409 INVALID_OWNER,409 TICKET_LOCKED,422 |
| 19 | PATCH /api/v1/staff/tickets/:id/priority | set IT Priority | IT Staff, Administrator | 200 StaffTicketDetailDto | 401,403,404,409 TICKET_LOCKED,422 |
| 20 | PATCH /api/v1/staff/tickets/:id/status | permitted status transition | IT Staff, Administrator | 200 StaffTicketDetailDto | 401,403,404,409 TICKET_LOCKED,409 INVALID_STATUS_TRANSITION,422 |
| 21 | GET /api/v1/staff/tickets/:id/comments | list Public Comments (staff view) | IT Staff, Administrator | 200 CommentDto[] | 401,403,404 |
| 22 | POST /api/v1/staff/tickets/:id/comments | post a Public Comment as staff | IT Staff, Administrator | 201 CommentDto | 401,403,404,422 |
| 23 | GET /api/v1/staff/tickets/:id/notes | list Internal Notes | IT Staff, Administrator | 200 InternalNoteDto[] | 401,403,404 |
| 24 | POST /api/v1/staff/tickets/:id/notes | post an Internal Note | IT Staff, Administrator | 201 InternalNoteDto | 401,403,404,422 |
| 25 | GET /api/v1/staff/tickets/:id/attachments | list attachments (read-only) | IT Staff, Administrator | 200 AttachmentDto[] | 401,403,404 |

A Requester calling any `/api/v1/staff/*` or `/api/v1/staff/*/notes` route receives 403
`FORBIDDEN_ROLE` with no ticket/note data in the body (FR-17, AC-04).

## Administrator User Management (§1.4)
| # | Method & Path | Purpose | Auth | Success | Errors |
|---|---|---|---|---|---|
| 26 | GET /api/v1/admin/users | list users, search by name/email, optional role filter | Administrator | 200 UserAdminDto[] | 401,403,422 |
| 27 | POST /api/v1/admin/users | create a user with one role + initial password | Administrator | 201 UserAdminDto | 401,403,409 EMAIL_ALREADY_EXISTS,422 |
| 28 | PATCH /api/v1/admin/users/:id | edit name/email/role/activation | Administrator | 200 UserAdminDto | 401,403,404,409 EMAIL_ALREADY_EXISTS / SELF_DEACTIVATION_BLOCKED / LAST_ADMIN_PROTECTED,422 |
| 29 | PATCH /api/v1/admin/users/:id/password | set a new initial password (forces mustChangePassword) | Administrator | 200 UserAdminDto | 401,403,404,422 |

## DTOs
LoginResponseDto: { user: MeDto } (+ ttk_session cookie set; token never appears in the body).

MeDto: { id, email, displayName, role, mustChangePassword } — never includes passwordHash.

CommentDto: { id, ticketId, body, authorRole: 'REQUESTER'|'IT_STAFF'|'ADMINISTRATOR',
author: { id, displayName }, createdAt }.

InternalNoteDto: { id, ticketId, body, author: { id, displayName }, createdAt }.

StaffTicketListItemDto: { id, ticketNumber, createdAt, summary, categoryName, requestedPriority,
itPriority, status, ownerId, ownerDisplayName (null if unassigned), updatedAt }.

StaffTicketDetailDto: same shape as Lab 2's TicketDetailDto plus { ownerId, ownerDisplayName,
itPriority (independently editable), resolvedIndicatedByRequester: boolean }.

UserSummaryDto: { id, displayName, role }.

UserAdminDto: { id, email, displayName, role, isActive, mustChangePassword, createdAt } — never
includes passwordHash.

## GET /api/v1/staff/tickets query parameters
`search` (ticketNumber or summary, case-insensitive substring), `status`, `ownerId` (`unassigned`
is a valid value), `itPriority`, `sort` (`createdAt`|`updatedAt`), `order` (`asc`|`desc`, default
`desc`), `page` (default 1), `pageSize` (default 20, max 50). Invalid/out-of-range values fall
back to the default rather than erroring (BR-25).

## GET /api/v1/admin/users query parameters
`search` (name or email, case-insensitive substring), `role` (optional, one of
REQUESTER/IT_STAFF/ADMINISTRATOR). No pagination or multi-column sort — excluded scope (sheet §8.5).

## Endpoint notes an agent will otherwise get wrong
- Endpoint 5–14's ownership is always `req.user.id` from the resolved session — never a body/query
  field (BR-03), same pattern as Lab 2's `x-dev-requester-id`, now session-backed instead.
- Endpoint 12 is a separate boolean flag, not a status write — it never changes `status` (BR-05).
- Endpoint 18's `NEW` is never a valid PATCH target; the first assignment auto-transitions
  NEW→OPEN server-side (BR-15) and is reflected in the response, not requested by the client.
- Endpoints 18/19/20 all return 409 `TICKET_LOCKED` for any mutation attempted on a `CANCELLED`
  ticket, or a `CLOSED` ticket other than the `status=REOPENED` request (BR-18).
- Endpoints 23/24 (Internal Notes) have no equivalent Requester-facing route at all — not a
  filtered response, an entirely separate route surface under `/staff/*` (BR-04).
- Endpoint 29 never accepts the new password's effect as immediate login — the target user must
  still pass through the mandatory Change Password screen at their next login (FR-22).
- Endpoint 28 checks `LAST_ADMIN_PROTECTED` and `SELF_DEACTIVATION_BLOCKED` against the live
  database count/session id at write time, not a cached value (BR-29, BR-30).
