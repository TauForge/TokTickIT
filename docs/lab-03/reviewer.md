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

TauForge also reviewed a classmate's (Bank848) Lab 3 pull requests on their own repo
(Bank848/toktickit), per the course's peer-review requirement. All 8 of Bank848's Lab 3 subsystem
PRs were reviewed and approved by TauForge, each merged only after that approval.

| Repo | PR | Title | Comments Given | Response | Approved | Merged |
|---|---|---|---|---|---|---|
| Bank848/toktickit | #42 | docs(lab-03): Sprint 3 engineering contract | "The Sprint 3 engineering contract is clear and consistent across the specification, tests, UI spec, and API spec. The updates also address the issues found during review." | "Thx for review you can merge." | Yes | 2026-09-15 15:06 UTC |
| Bank848/toktickit | #44 | feat(lab-03): data model increment, migration and seed (#35) | "LGTM. The data model, migration, and seed changes are clear, and the added tests cover migration and seed behavior well." | "Thx for review. You can merge." | Yes | 2026-09-15 15:27 UTC |
| Bank848/toktickit | #45 | feat(lab-03): authentication foundation and session-based identity (#36) | Approved with comments: praised the httpOnly/SameSite=Lax cookie flags, 256-bit hashed session tokens, bcrypt hashing, identical 401 for unknown email vs. wrong password, and the globally-wired mandatory-password-change gate; flagged one MEDIUM (`verifyPassword` skipped entirely for a non-existent email, a timing side-channel) and two LOW findings (no rate limiting, no explicit CSRF token) as non-blocking follow-ups | "Agreed on the timing side-channel... I'll track that as a follow-up fix rather than blocking this merge on it." | Yes | 2026-09-15 16:00 UTC |
| Bank848/toktickit | #46 | feat(lab-03): Requester session-identity regression and Public Comments (#37) | "The session-identity regression coverage and Public Comments changes are clear, and the test suite and TypeScript checks are all passing." | "thx for review you can merge." | Yes | 2026-09-15 16:11 UTC |
| Bank848/toktickit | #47 | feat(lab-03): IT Staff Ticket Queue (#38) | "The IT Staff ticket queue, filtering, sorting, pagination, and role-based access are clearly implemented. Tests and TypeScript checks are all passing." | "Thanks for the review." | Yes | 2026-09-15 16:36 UTC |
| Bank848/toktickit | #48 | feat(lab-03): IT Staff Ticket Detail (#39) | "The IT Staff ticket detail, ownership, priority, status transitions, comments, notes, and attachments are clearly implemented. All tests and TypeScript checks are passing." | "Thanks for the review." | Yes | 2026-09-15 16:48 UTC |
| Bank848/toktickit | #49 | feat(lab-03): Administrator User Management (#40) | "The admin user management features are clearly implemented, including user search, role filtering, create/edit, password reset, and activation controls. The self-deactivation and last-admin safety rules are also covered." | "Thanks for the review." | Yes | 2026-09-15 17:13 UTC |
| Bank848/toktickit | #50 | feat(lab-03): E2E suite, visual evidence, and reviewer close-out (#41) | "The E2E coverage, visual evidence, and cross-cutting fixes are thorough. Unit tests and TypeScript checks are passing, and the remaining E2E run is clearly documented for reviewer verification." | "thx for review you can merge" | Yes | 2026-09-15 17:40 UTC |
