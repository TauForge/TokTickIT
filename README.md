# TokTickIT

TokTickIT is an IT service desk application being built through the CPE334 individual sprint workflow.

## Current branch scope

This branch contains the Issue 1 foundation, Issue 2 API health check, Issue 3 category seed, and Issue 4 category list:

- React + TypeScript + Vite frontend with Bootstrap styling
- Node.js + Express + TypeScript backend
- PostgreSQL Docker Compose service
- Prisma schema and generated-client configuration
- Vitest and Supertest test commands
- Environment and repository safety templates
- `GET /api/health` with a Supertest verification
- React health status, loading state, and backend-unavailable error state
- Prisma `Category` model, migration, and idempotent seed for four IT request categories
- `GET /api/categories` backed by Prisma with predictable ID ordering
- React category list loaded from the API with loading and error states

No later application features are implemented on this branch.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop or another Docker Compose implementation

## Setup

From the repository root:

```bash
cp .env.example server/.env
cp client/.env.example client/.env
npm run install:all
docker compose up -d db
npm --prefix server run prisma:generate
npm --prefix server run prisma:validate
npm --prefix server run prisma:migrate:deploy
npm --prefix server run prisma:seed
```

The local database is PostgreSQL at `localhost:5432`. The migration creates the `Category` table and the seed creates `Account and Access`, `Hardware`, `Software`, and `Network` without duplicates when rerun. The client reads `VITE_API_BASE_URL` from `client/.env`; its development value is `http://localhost:3000`. The database credentials are development-only values from `.env.example`; never commit either `.env` file or any real credentials.

## Run the foundation and health check

In separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Open the Vite URL shown in the client terminal. The app now opens on the Development Requester
selector screen; after picking a requester you land on My Tickets, from where you can create a
ticket or open an existing one on the Ticket Detail screen.

## Test and build

```bash
npm test
npm run build:client
npm run build:server
```

## Lab 1 submission documentation

- [AI use record](docs/lab-01/ai_use.md)
- [Peer-review record](docs/lab-01/reviewer.md)
- [Test evidence](docs/lab-01/tests.md)

## Lab 2: Requester Ticketing MVP

Lab 2 adds the Development Requester selector, ticket creation, My Tickets, Ticket Detail, and
file attachments on top of the Lab 1 foundation above. See `docs/lab-02/specification.md` for the
full requirements and `docs/lab-02/tests.md` for the test plan and results.

### Attachment storage

Ticket attachments are written to disk under a directory configured by `ATTACHMENT_STORAGE_DIR`
in `server/.env` (see `server/.env.example`), for example:

```
ATTACHMENT_STORAGE_DIR=./uploads
```

The directory is created automatically on first upload if it doesn't exist and is git-ignored.

### One-time test database setup

Server tests run against a dedicated `toktickit_test` database, kept separate from the `toktickit`
dev database so tests never touch dev data. Once you have a Postgres instance reachable at the
connection details in `server/.env`:

```bash
createdb toktickit_test
```

Then create `server/.env.test` (git-ignored, not committed) pointing at that database and using a
test-only upload directory, for example:

```
DATABASE_URL="postgresql://postgres:<password>@<host>:<port>/toktickit_test"
ATTACHMENT_STORAGE_DIR=./uploads-test
```

`cd server && npm test` picks up `server/.env.test` automatically and runs migrations/seeds
against `toktickit_test`, never against the dev database.

### Running the E2E suite

The `e2e/` package runs Playwright tests against the client and server started in dev mode. It
starts both dev servers for you (see `e2e/playwright.config.ts`), so no manual `npm run dev` step
is required first:

```bash
cd e2e
npx playwright test
```

## Lab 3: Authentication, Staff Workflow, and Admin User Management

Lab 3 replaces the Lab 2 Development Requester selector with real email/password login,
session cookies, mandatory first-login password changes, an IT Staff ticket queue and
detail workflow (owner claim/reassign, priority, status transitions, Public Comments,
Internal Notes), and Administrator user management. See `docs/lab-03/specification.md`
for the full requirements and `docs/lab-03/tests.md` for the test plan and results.

### Lab 3 seeded accounts (local dev only)

Every seeded account below shares the password `DevPass123!` — a local-dev-only fixture
password, never a real credential — except `onboarding@toktickit.local`, which also starts
on `DevPass123!` but is forced through Change Password at its very first login
(`mustChangePassword=true`).

The 5 Lab 2 Requester accounts (materialized by
`server/prisma/migrations/20260915090000_lab3_auth_and_staff`, same shared password):

| Email | Role |
| --- | --- |
| jennifer.anderson@toktickit.dev | REQUESTER |
| michael.brown@toktickit.dev | REQUESTER |
| sarah.johnson@toktickit.dev | REQUESTER |
| david.lee@toktickit.dev | REQUESTER |
| retired.alumnus@toktickit.dev | REQUESTER (inactive — used to verify the "account cannot sign in right now" state) |

The Lab 3 fixtures (`server/prisma/seed.ts`):

| Email | Role |
| --- | --- |
| amy.tran@toktickit.dev | IT_STAFF |
| carlos.mendez@toktickit.dev | IT_STAFF |
| priya.natarajan@toktickit.dev | IT_STAFF |
| former.tech@toktickit.dev | IT_STAFF (inactive) |
| onboarding@toktickit.local | IT_STAFF (mandatory first-login password change) |
| admin@toktickit.dev | ADMINISTRATOR |
