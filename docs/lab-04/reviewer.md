# Lab 4 Reviewer Log

Reviewer identity: Bank848, a peer classmate with write access on TauForge/TokTickIT, per the course's PR-review
workflow. Each subsystem PR was opened as a draft against `lab4-staging`, marked ready with Bank848 as reviewer,
reviewed, fixed, re-reviewed, approved and merged by Bank848 in order. The author never merged. Each PR is stacked on
the previous branch; after a merge the next PR's base was moved to `lab4-staging`.

## Reviews received on TauForge/TokTickIT

| PR | Feature Branch | Reviewer | Comments Given | Comments Received | Response | Approved |
|---|---|---|---|---|---|---|
| [#49](https://github.com/TauForge/TokTickIT/pull/49) | lab4-10a-actions-foundation | Bank848 | 2 required fixes | status check not in the same transaction as the write; idempotency key not scoped to its ticket | fixed in 341abfa (row lock inside the write transaction, 409 IDEMPOTENCY_KEY_REUSED), tests API-24 and API-25 fail before and pass after | Approved, merged 2026-10-31 |
| [#50](https://github.com/TauForge/TokTickIT/pull/50) | lab4-10b-workflow | Bank848 | 3 comments | spec table said 404 where code and api-spec say 403; resolved-indication bumped `Ticket.version`; no test for the gate transaction | fixed in a2e4c74: spec corrected, version left unchanged, API-26 races Action create against RESOLVED | Approved, merged 2026-10-31 |
| [#51](https://github.com/TauForge/TokTickIT/pull/51) | lab4-10c-dashboards | Bank848 | 4 | list endpoint accepted only status NEW; My Open had no matching filter; count and list read separately; wall-clock performance test and a redundant index | fixed in e8c8f1e: all statuses plus `activeOnly`, BR-22a/22b, 2 s smoke bound, redundant index dropped with rollback; fixture cleanup left as is and explained | Approved, merged 2026-10-31 |
| [#52](https://github.com/TauForge/TokTickIT/pull/52) | lab4-10d-actions-ui | Bank848 | 3 comments plus minor | Reload then Save could silently overwrite another user's edit; edit rewrote `actionAt` to the minute; controls enabled while a write was in flight | fixed in 9b8adfa with three new tests that fail on the old code; the reviewer withdrew the vague accessible-names note | Approved, merged 2026-10-31 |
| [#53](https://github.com/TauForge/TokTickIT/pull/53) | lab4-10e-dashboards-ui | Bank848 | 3 comments plus minor | My Open link unfiltered; client-side filtering workaround; filters read only on first mount | fixed in 3efb2d3: server filter used, URL-driven filters, focus on the list heading, one date format on lists | Approved, merged 2026-10-31 |
| [#54](https://github.com/TauForge/TokTickIT/pull/54) | lab4-10f-hardening | Bank848 | 6 | stale README, a test that could not fail, E2E not checking the filtered list, VISUAL-01 marked Pass too early, server changes in a hardening PR, draft reflection | fixed in 66788ff and 310acac: README rewritten, E2E asserts filtered rows, VISUAL-01 set to Partial, behaviour changes listed in the PR description, reflection written | Approved, merged 2026-10-31 |
| [#55](https://github.com/TauForge/TokTickIT/pull/55) | lab4-staging into `main` | Bank848 | 1 (checked the diff equals the six approved PRs, Closes lines work) plus 1 wording note | reviewer.md called three comment reviews "changes requested" | fixed in 5fc1274 | Approved, merged 2026-10-31; issues #41 to #48 closed automatically |
| [#56](https://github.com/TauForge/TokTickIT/pull/56) | lab4-final-polish | Bank848 | 1 (approved after checking the owner-select and checkbox fixes against their tests) | none to fix | n/a | Approved, merged 2026-10-31 |
| [#57](https://github.com/TauForge/TokTickIT/pull/57) | lab4-staging into `main` (final) | Bank848 | 1 (approved: the same content as #55 and #56, nothing new to fix) | none to fix | n/a | Approved, merged 2026-10-31 |

Every review was posted as a comment review first and, after the fixes were checked against the named commit, an
approval. The full text of each review and reply is on the linked PR pages.

## Reviews given to peers

Reviews TauForge gave on Bank848's Lab 4 pull requests in the Bank848/toktickit repo.

| Repo | PR | Title | Comments Given | Response | Approved | Merged |
|---|---|---|---|---|---|---|
| Bank848/toktickit | [#60](https://github.com/Bank848/toktickit/pull/60) | feat(lab-04): Action Taken UI | Approved after reading the staff and requester flows, ETag and Idempotency-Key handling, loading, empty and error states, input preserved on failure, and the unit and Playwright coverage; no blocking issues | Author confirmed nothing was left open and asked for the merge | Approved 2026-10-31 | Merged into lab4-staging |
| Bank848/toktickit | [#61](https://github.com/Bank848/toktickit/pull/61) | feat(lab-04): ticket resolution gate | Approved after reading the server-side gate, the transaction with `SELECT FOR UPDATE`, ETag and If-Match checks, explicit error cases and role-based tests; no blocking issues | Author thanked the review and disclosed one open test (API-47) that needs a migration, deferred on purpose | Approved 2026-10-31 | Merged into lab4-staging |
| Bank848/toktickit | [#62](https://github.com/Bank848/toktickit/pull/62) | feat(lab-04): role dashboards | Approved after reading the separate Requester, Staff and Administrator dashboards, the owned, unassigned and terminal-status counting, the database aggregation, the drill-down links into existing ticket filters, role-based access, invalid filter handling and the dashboard tests; no blocking issues | Author disclosed that the Unassigned card excludes Closed and Cancelled tickets while its link lists every status, so the card can be lower than the list; left unchanged because the spec does not say which is right | Approved 2026-10-31 | Merged into lab4-staging |
| Bank848/toktickit | [#63](https://github.com/Bank848/toktickit/pull/63) | feat(lab-04): final hardening and regression | Approved the final integration, tests, evidence screenshots and documentation updates; the review text quoted figures and fixes (406 server, 96 client, 46 E2E, owner select, checkbox CSS) that belong to TauForge's own PR #56, not to this tests-and-docs PR | Author pointed this out on the PR and gave the correct record: 375 server tests, 219 client tests, 45 of 54 Playwright scenarios passing (6 skipped by design, 3 failing from the old Lab 2 spec, listed in the PR body) | Approved 2026-10-31 | Merged into lab4-staging |
| Bank848/toktickit | [#64](https://github.com/Bank848/toktickit/pull/64) | Lab 4: TokTickIT Action Taken, Resolution Gate, and Role Dashboards (lab4-staging into main) | Approved the release PR with a one-line review ("Great Work lil bro!"), no detailed comments | none | Approved 2026-10-31 | Merged into main |
