# Lab 2 AI Use and Reflection

LLM used: Claude (Sonnet 5, via Claude Code), running a spec-driven, subagent-per-task workflow with an independent reviewer subagent after every task.

| # | Prompt (summarized) | Purpose |
|---|---|---|
| 1 | "Read the Lab 2 labsheet and lecture; list every FR/BR/AC needed for a strict-scope spec." | specification.md drafting |
| 2 | "Draft the Prisma schema for Requester/Ticket/Attachment/TicketCounter/RelatedSystem, explicit onDelete:Restrict on every relation." | schema.prisma |
| 3 | "Write the failing Vitest+Supertest test for atomic ticket-number generation under 10 concurrent calls." | ticketNumber.test.ts |
| 4 | "Write the devRequester middleware: validate x-dev-requester-id against active Requesters, 401 otherwise." | devRequester.ts |
| 5 | "Design the My Tickets query parameters and their safe-fallback behavior for invalid input." | ticketQuery.ts |
| 6 | "Review the implementation against every acceptance criterion in specification.md; report gaps." | Task 25 completion review |

## My Reflection

The agent got the mechanical parts right on the first pass, atomic ticket numbering, the 404-not-403 ownership check, the transaction-locked attachment cap, but it missed one integration gap no single task owned: nothing linked the My Tickets list to Ticket Detail until the final whole-branch review caught it. That was the clearest lesson from this lab. Per-task review checks a task against its own brief, but only a pass over the whole branch catches the seams between tasks. I also had to push back once on scope, when a task's own brief listed a file it never actually specified changes for, the agent flagged the gap and asked for a ruling instead of guessing, which I'd rather have than a silent assumption baked into the schema.
