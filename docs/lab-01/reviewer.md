# Peer-review record

## Reviewer identity

- Name: Bank
- Student ID: **[REQUIRED - enter the reviewer's actual student ID before submission]**
- GitHub username: [Bank848](https://github.com/Bank848)
- Review date: 2026-08-14

The same peer reviewer reviewed the feature PRs and the final promotion PR. The reviewer identity above is taken from the GitHub account; the student ID is not present in the repository or GitHub review metadata and must not be guessed.

## Pull-request evidence

| Pull request | Branch and target | Review feedback | Action taken | Result |
| --- | --- | --- | --- | --- |
| [PR #5](https://github.com/TauForge/TokTickIT/pull/5) | `feature/1-project-foundation` -> `lab1-staging` | Foundation setup was clean, correctly scoped to Issue 1, and had workspaces, Docker, Prisma, and tests wired up. | No changes requested. | Approved and merged as `5972d94`. |
| [PR #6](https://github.com/TauForge/TokTickIT/pull/6) | `feature/2-health-check` -> `lab1-staging` | Health endpoint and UI states were covered. The reviewer also noted that the API URL was hard-coded to `localhost:3000` and that a hung request had no timeout. | Added `VITE_API_BASE_URL`, `client/.env.example`, a five-second `AbortController` timeout, a timeout message, and Vitest coverage in commit `694e0ef`. Replied to the inline comment and resolved the thread. | Approved and merged as `908df8e`. |
| [PR #7](https://github.com/TauForge/TokTickIT/pull/7) | `feature/3-category-seed` -> `lab1-staging` | The Prisma Category model, migration, and idempotent upsert seed were clean, scoped, and had no issues. | Confirmed the acceptance criteria in a PR reply; no code changes were needed. | Approved and merged as `d6a99c7`. |
| [PR #8](https://github.com/TauForge/TokTickIT/pull/8) | `feature/4-category-list` -> `lab1-staging` | The API used Prisma correctly, and the frontend had response validation, loading/error states, and matching test coverage. No issues were found. | No changes requested. | Approved and merged as `426334b`. |
| [PR #9](https://github.com/TauForge/TokTickIT/pull/9) | `lab1-staging` -> `main` | This promotion contained the already-reviewed Issue 1-4 changes and introduced no new content. No issues were found. | No changes requested. | Approved and merged as `6f3c281`. |

## Review response record

For PR #6, the response to the inline review stated that commit `694e0ef` added the configurable client API URL, five-second timeout, timeout message, and Vitest coverage. For PR #7, the response confirmed that the Category model, migration, and idempotent upsert seed matched the Issue 3 acceptance criteria.
