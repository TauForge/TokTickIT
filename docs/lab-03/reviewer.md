# Lab 3 Reviewer Log

Reviewer identity: peer classmate on the TauForge/TokTickIT repo (Bank848), per the course's
PR-review workflow. Each Lab 3 subsystem PR was opened one at a time (never more than one open
simultaneously), reviewed, and merged into `lab3-staging` before the next one opened.

| PR | Feature Branch | Reviewer | Comments Given | Comments Received | Response | Approved |
|---|---|---|---|---|---|---|
| #34 | feature/9a-lab3-auth-foundation | Bank848 | 0 inline | General approval of the session/password/migration cutover from the Lab 2 dev header | Thanked, no changes needed | Yes |
| #35 | feature/9b-lab3-requester-client | Bank848 | 0 inline | General approval + flagged `MyTickets.tsx` still calling the pre-versioning `/api/tickets` endpoint | Confirmed as a real bug at the PR's head commit, fixed and pushed | Yes |
| #38 | feature/9c-lab3-it-staff | Bank848 | 0 inline | General approval + 3 points: (1) Ticket Owner dropdown listing the current user twice, (2) fragile string-matched forbidden-error detection, (3) no explicit unassign action | (1) confirmed real bug, fixed; (2) acknowledged as a known follow-up (`ApiRequestError` doesn't carry HTTP status yet); (3) confirmed intentional per ui-spec.md | Yes |
| #37 | feature/9d-lab3-admin | Bank848 | 0 inline | General approval + 3 points: (1) no CSRF token anywhere in the app, (2) `role` query param on `GET /admin/users` reaching Prisma unvalidated, (3) same fragile forbidden-error detection as #38 | (1) acknowledged, mitigated by existing `sameSite=lax`, full CSRF token deferred as a follow-up; (2) confirmed real bug, fixed; (3) same follow-up note as #38 | Yes |
| #39 | feature/9e-lab3-e2e-final | Bank848 | 0 inline | General approval — no blocking issues, specifically praised the CORS/mobile-CSS bug fixes the E2E pass surfaced | Thanked, no changes needed | Yes |
| #40 | lab3-staging (into `main`) | (pending) | | | | |

This table is updated as each PR is opened, reviewed, and merged — never opened/merged by an
automated task; each row is filled in by hand once the corresponding manual PR step happens.

## Reviews given to peers

TauForge also reviewed a classmate's Lab 3 PR on their own repo, per the course's peer-review
requirement.

| Repo | PR | Title | Comments Given | Response |
|---|---|---|---|---|
| Bank848/toktickit | #45 | Lab 3 auth foundation (session, password, mandatory-password-change gate) | Approved with comments: praised the timing-safe-comparison-adjacent design (identical 401 for unknown email vs. wrong password), session token hashing, and the global mandatory-password-change gate; flagged one MEDIUM (`verifyPassword` skipped entirely for a non-existent email, a timing side-channel that undermines the otherwise-identical 401 response) and two LOW findings (no rate limiting, no explicit CSRF token) as non-blocking follow-ups | Approved |
