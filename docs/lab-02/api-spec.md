# Lab 2 API Contract

All responses: `{ ...data }` on 2xx, `{ "error": { "code", "message", "fieldErrors": [] } }`
on non-2xx. All requester-scoped endpoints require header `x-dev-requester-id: <int>`
(401 UNAUTHENTICATED if missing/unknown/inactive).

| # | Method & Path | Purpose | Auth header | Success | Errors |
|---|---|---|---|---|---|
| 1 | GET /api/health | Lab 1 liveness (unchanged) | no | 200 | - |
| 2 | GET /api/categories | active categories | no | 200 [{id,name,code}] | - |
| 3 | GET /api/related-systems | active related systems | no | 200 [{id,name}] | - |
| 4 | GET /api/dev-requesters | active dev requesters | no | 200 [{id,name,email}] | - |
| 5 | POST /api/tickets | create a ticket | yes | 201 TicketDetailDto | 401,422 |
| 6 | GET /api/tickets | list own tickets (paginated) | yes | 200 TicketListDto | 401,400 |
| 7 | GET /api/tickets/:id | one owned ticket | yes | 200 TicketDetailDto | 401,404 |
| 8 | POST /api/tickets/:id/attachments | upload attachment | yes | 201 AttachmentDto | 401,404,409,413,415 |
| 9 | GET /api/tickets/:id/attachments | list attachments (incl. removed metadata) | yes | 200 AttachmentDto[] | 401,404 |
| 10 | GET /api/attachments/:id/download | download an active attachment | yes | 200 file stream | 401,404 |
| 11 | DELETE /api/attachments/:id | soft-remove (body: {reason}) | yes | 200 AttachmentDto | 401,400,404 |

## DTOs
TicketDetailDto: { id, ticketNumber, summary, description, categoryId, categoryName,
relatedSystemId, relatedSystemName, requestedPriority, itPriority, status, requesterId,
createdAt, updatedAt }

TicketListDto: { items: TicketDetailDto[] (summary fields only), page, pageSize, totalItems,
totalPages }

AttachmentDto: { id, ticketId, filename, mimeType, sizeBytes, isRemoved, removedAt,
removedReason, downloadUrl (null if isRemoved), createdAt }

## GET /api/tickets query parameters
`search` (matches ticketNumber or summary, case-insensitive substring), `categoryId`,
`requestedPriority`, `itPriority`, `status`, `sort` (`createdAt`|`updatedAt`), `order`
(`asc`|`desc`, default `desc`), `page` (default 1), `pageSize` (default 10, max 50).
Invalid/out-of-range values fall back to the default rather than erroring (BR-20).
Example: `GET /api/tickets?search=laptop&status=NEW&page=1&pageSize=10`

## Endpoint notes an agent will otherwise get wrong
- Endpoint 5's `requesterId` is NEVER read from the body — always `req.requester.id` set by the
  devRequester middleware from the validated header (BR-05).
- Endpoint 5's `itPriority` is NEVER read from the body — always copied server-side from
  `requestedPriority` (BR-04).
- Endpoints 7, 8, 9, 10, 11 all re-check `ticket.requesterId === req.requester.id` (or the
  attachment's parent ticket's requesterId) and return 404 — not 403 — on mismatch (BR-18).
- Endpoint 8 checks the active-attachment count for the ticket BEFORE writing the file to disk;
  a 6th attempt returns 409 without touching storage.
- Endpoint 10 returns 404 (not a 200 with an error body) if the attachment is soft-removed —
  the response must never leak that a removed file used to exist with real bytes.
- Endpoint 5 and endpoint 8 are independent calls; a Ticket created successfully is never rolled
  back because a later attachment upload fails (BR-17).
