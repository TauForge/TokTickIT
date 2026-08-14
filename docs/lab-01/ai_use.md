# AI Use Record

## Tool and responsibility

- Tool: OpenAI Codex in the Codex desktop app.
- Model: GPT-5.
- Repository owner and final decision-maker: TauForge.
- AI assistance was used for planning, implementation, test updates, documentation, and GitHub workflow operations. The student reviewed the diffs, test results, pull requests, and peer-review feedback before accepting each change.
- GitHub authorship remained `TauForge`; no `Co-authored-by` trailer for ChatGPT or Codex was added to commits or pull requests.

## Selected prompts kept as an implementation record

| Stage | Selected prompt | Result |
| --- | --- | --- |
| Planning | "Before doing anything, read Lab1_Labsheet.pdf and Lab1_Git_GitHub_CheatSheet.pdf in this folder in full." | The labsheet and Git/GitHub workflow were read before implementation. The exact branch, issue, Project, and review workflow was followed. |
| Issue 1 | "ต่อ step 3" | Created the foundation branch and implemented only the repository foundation acceptance criteria. |
| Issue 2 | "ทำ pr ของ issue 2 ต่อเลย" | Implemented the health-check issue, opened PR #6, and prepared it for review. |
| Review fix | "มีคนมารีวิว pr 6 แล้วแก้ไจอะไรตามรีวิว แล้วก็ตอมกลับคอมเมนต์ แล้วก็ merge ได้เลย" | Addressed the hard-coded API URL and missing request timeout, replied to the inline review, and merged PR #6. |
| Issue 3 | "ทำ pr ของ issue #3 ต่อเลย" | Implemented the Prisma Category model, migration, and idempotent seed, then opened PR #7. |
| Issue 4 | "เปิด pr ของ issue 4 ต่อเลย" | Implemented the Prisma-backed category API, React category list, loading/error states, and tests, then opened PR #8. |
| Final integration | "merge แล้วไปทำงานเอกสารกัน" | Merged the approved final promotion PR #9 into `main` and started the submission-documentation work. |

## Verification and reflection

- The repository structure, fixed technology stack, issue acceptance criteria, required branch names, and Project status workflow were checked against the labsheet.
- Frontend Vitest, backend Supertest, TypeScript builds, Git history, PR base/head branches, review approvals, and merge states were checked before recording the results.
- Peer feedback on PR #6 led to a real change: `VITE_API_BASE_URL` and `client/.env.example` were added, health requests received a five-second `AbortController` timeout, and timeout behavior was tested.
- The category API route uses the real Prisma client at runtime. Its Supertest test uses a mocked `findMany` result so the HTTP contract can be tested deterministically without requiring a live PostgreSQL service during the test run.
- The student remains responsible for the final code, database setup, documentation accuracy, and submission requirements.
