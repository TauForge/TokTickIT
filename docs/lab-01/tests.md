# Lab 1 Test Evidence

## Test files

| Test file | Tool | Coverage |
| --- | --- | --- |
| `client/tests/lab-01/App.test.tsx` | Vitest + Testing Library | Foundation heading and Bootstrap marker, successful health response, unavailable backend, health timeout, API-provided category rendering, and category API error state. |
| `server/tests/lab-01/foundation.test.ts` | Supertest | Foundation route and `/api/health` response. |
| `server/tests/lab-01/categories.test.ts` | Supertest + Vitest | `/api/categories` response, selected `id`/`name` fields, and predictable `id ASC` Prisma ordering. |

## Commands and results

All commands were run from the repository root on 2026-08-14.

| Command | Result |
| --- | --- |
| `npm test` | Passed. Frontend: 1 test file, 6 tests. Backend: 2 test files, 3 tests. |
| `npm run build:client` | Passed. TypeScript project build and Vite production build completed successfully. |
| `npm run build:server` | Passed. Backend TypeScript build completed successfully. |

## Acceptance-criteria mapping

- Issue 1: Express foundation and React/Vite/Bootstrap foundation are covered by the foundation tests and client foundation assertions.
- Issue 2: `/api/health`, successful status, unavailable-backend error, configurable API URL, and five-second timeout are covered by the server foundation test and the client Vitest tests.
- Issue 3: Prisma `Category` schema, migration, and idempotent seed are included in the server setup. The seed is rerunnable without duplicate category names.
- Issue 4: `/api/categories` queries Prisma with `select: { id, name }` and `orderBy: { id: "asc" }`; the React UI renders the returned values and exposes loading/error states. Both the Supertest route contract and category-list UI behavior are tested.

## Database and runtime note

The application route uses the real Prisma client and PostgreSQL at runtime. The category Supertest isolates the HTTP route by mocking `prisma.category.findMany`, so the automated test does not require an external database. To perform the live database check, follow the README setup: configure `server/.env`, start PostgreSQL with Docker Compose, deploy the migration, run the seed, and then start the backend and frontend.
