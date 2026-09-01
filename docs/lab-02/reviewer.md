# Lab 2 Reviewer Log

Reviewer identity: peer classmates on the TauForge/TokTickIT repo (N0M3KM, MacOverlorD), per the course's PR-review workflow.

| PR | Feature Branch | Reviewer | Comments Given | Comments Received | Response | Approved |
|---|---|---|---|---|---|---|
| #19 | feature/1-lab2-spec-docs | N0M3KM | 0 | "The code is clean. Everything seems to be functioning correctly." | Thanked, no changes needed | Yes |
| #20 | feature/2-lab2-data-model | MacOverlorD | 2 inline (Category.code nullable, /api/categories bypassing errorEnvelope) | General approval + 2 non-blocking suggestions | Explained both were deliberate/tracked, no code change | Yes |
| #21 | feature/3-lab2-dev-requester-context | MacOverlorD | 0 | "Look Ok to me." | Merged as-is | Yes |
| #22 | feature/4-lab2-ticket-creation | N0M3KM | 0 | General approval | Thanked | Yes |
| #23 | feature/5-lab2-my-tickets | N0M3KM | 0 | "LGTM Good job :)" | Thanked | Yes |
| #24 | feature/6-lab2-ticket-detail-attachments | N0M3KM, Jinnakan | 0 | General approval + a design-comparison comment on the 404-not-403 ownership choice and the RFC 5987 attachment filename encoding | Explained the 404 choice was a deliberate BR-18/FR-20 spec call | Yes |
| #25 | feature/7-lab2-zen-green-theme | MacOverlorD | 0 | "Great work!" | Thanked | Yes |
| #26 | feature/8-lab2-e2e-integration | (pending) | | | | |

This table is updated as each PR is opened, reviewed, and merged — never opened/merged by an
automated task; each row is filled in by hand once the corresponding manual PR step happens.

## Reviews given to peers

TauForge also reviewed classmates' Lab 2 PRs on their own repos, per the course's peer-review requirement.

| Repo | PR | Title | Comments Given | Response |
|---|---|---|---|---|
| N0M3KM/TokTickIT | #18 | Feature 5: Specification | "LGTM!" | Approved |
| N0M3KM/TokTickIT | #20 | Feature 7: Reference Data API | "Looks good to me. The API endpoints, sorting/filtering behavior, and test coverage all look good." | Approved |
| N0M3KM/TokTickIT | #21 | Feature 8: Add ticket and attachment endpoints with validation and tests | "Looks good to me. The ticket and attachment endpoints, validation, and test coverage look solid." | Approved |
| N0M3KM/TokTickIT | #22 | Feature 9: Add Dev Requester Selection screen and application shell | "Looks good to me. The requester selection flow, app shell, routing, and test coverage look solid." | Approved |
| MacOverlorD/toktickit | #20 | docs: define Lab 2 engineering contract | Requested changes — asked for an example of the idempotent ticket-number generation rules in specification.md | Author added the example, re-reviewed and approved |
| MacOverlorD/toktickit | #21 | feat: add Lab 2 ticket data foundation | Requested changes — one blocking item on `Requester.email` before it locks in as the identity key for the rest of Lab 2 | Author addressed it, re-reviewed and approved |
| MacOverlorD/toktickit | #22 | feat: establish Lab 2 Zen Green UI foundation | Requested changes — asked for a test covering mobile navigation/menu behavior | Author added the test, re-reviewed and approved |
