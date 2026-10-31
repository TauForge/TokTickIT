# TokTickIT

TokTickIT is an IT service desk application being built through the CPE334 individual sprint workflow.

## Project status

TokTickIT is an IT service desk application built across four CPE334 sprints. The main branch contains:

- **Lab 1:** React + TypeScript + Vite frontend, Node.js + Express + TypeScript backend, PostgreSQL with Prisma, `GET /api/health`, and the category list.
- **Lab 2:** Requester ticketing: create tickets, My Tickets, Ticket Detail, attachments, and public comments.
- **Lab 3:** Authentication with sessions, the IT Staff queue and workflow (owner, IT Priority, status), internal notes, staff attachments, and Administrator user management.
- **Lab 4:** Actions Taken on tickets, the refined status workflow with a resolution gate and stale-update protection, and role dashboards. See the Lab 4 section below.

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

Open the Vite URL shown in the client terminal and sign in with a seeded account (see the Lab 3 section for the
seeded users). Every role lands on its Dashboard; from there you can reach My Tickets or the staff queue, create a
ticket, and open a ticket on its detail screen.

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

## Lab 4: Actions Taken, Ticket Workflow Rules, and Dashboards

Lab 4 adds Actions Taken (work records on a Ticket), a stricter Ticket workflow, and role-based
dashboards. See `docs/lab-04/specification.md` for requirements, `docs/lab-04/api-spec.md` for the
endpoints, `docs/lab-04/ui-spec.md` for the screens and `docs/lab-04/tests.md` for the test plan and
results.

### New features

- **Actions Taken.** IT Staff and Administrators add and edit Actions on a Ticket (description, result,
  optional follow-up and attachment notes). The performer is always the signed-in user. Actions are never
  deleted. Requesters see the Actions on their own Tickets read-only.
- **Workflow rules.** A refined status transition matrix, a resolution gate (a Ticket needs at least one
  Action before it can move to Resolved), and optimistic concurrency: owner, priority, status and Action
  writes send `expectedVersion`, and a stale write gets `409 STALE_UPDATE` with a Reload prompt.
  Action creation accepts an `Idempotency-Key` header so a retried click does not duplicate.
- **Dashboards.** The Dashboard is the landing page for every role. Requesters see counts for their own
  Tickets; IT Staff see queue metrics with drill-down links into the filtered queue; Administrators also see
  user counts. All counts are computed in SQL by the backend.
- **Create Ticket for staff.** IT Staff and Administrators may create a Ticket for themselves (the Lab 4
  handout lists Create Ticket as a staff quick action). `requesterId` is always the session user.

### New endpoints (base path `/api/v1`)

| Method and path | Who |
| --- | --- |
| GET, POST `/staff/tickets/:id/actions` | IT Staff, Administrator |
| PATCH `/staff/tickets/:id/actions/:actionId` | the performer, or an Administrator |
| GET `/tickets/:id/actions` | the Requester who owns the Ticket (read-only) |
| GET `/dashboard/requester` | Requester |
| GET `/dashboard/staff` | IT Staff, Administrator |

Existing owner, priority and status PATCH routes now require `expectedVersion`. `GET /staff/tickets` also
accepts `activeOnly=true` and `ownerId=<id>|unassigned`.

### Migration, rollback and seed

```bash
cd server
npx prisma migrate deploy      # applies lab4_actions_taken and lab4_dashboard_indexes (additive only)
npx prisma db seed             # idempotent; adds 12 Lab 4 tickets SEED4-001..012 and sample Actions
```

Rollback is a manual SQL script per migration, newest first, run against the database you want to revert:

```bash
psql "$DATABASE_URL" -f prisma/migrations/20261031110000_lab4_dashboard_indexes/rollback.sql
psql "$DATABASE_URL" -f prisma/migrations/20261031100000_lab4_actions_taken/rollback.sql
```

Afterwards delete the matching rows from `_prisma_migrations`. The migration and rollback are tested on a
scratch database (`server/tests/lab-04/migration.test.ts`), never on dev or test data.

### Running the Lab 4 tests

```bash
cd server && npm test                       # all server suites (Labs 1-4)
cd client && npm test                       # all client suites
cd client && npx tsc -b && npx vite build   # type check and production build
cd e2e && npx playwright test lab-04        # Lab 4 E2E (starts the dev servers)
```

The E2E run uses the dev database and writes screenshots to `artifacts/lab-04/screenshots/`
(`staff-dashboard`, `requester-dashboard`, `actions-taken`, each at `desktop` 1280, `tablet` 820 and
`mobile` 390). Re-run `npx prisma db seed` afterwards: the Lab 3 first-login spec changes the password of
`onboarding@toktickit.local`, and the seed restores it. Lab 4 uses the same seeded accounts and shared
development password as Lab 3.
