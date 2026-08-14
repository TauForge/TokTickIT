# TokTickIT

TokTickIT is an IT service desk application being built through the CPE334 individual sprint workflow.

## Current branch scope

This branch contains the Issue 1 foundation and Issue 2 API health check:

- React + TypeScript + Vite frontend with Bootstrap styling
- Node.js + Express + TypeScript backend
- PostgreSQL Docker Compose service
- Prisma schema and generated-client configuration
- Vitest and Supertest test commands
- Environment and repository safety templates
- `GET /api/health` with a Supertest verification
- React health status, loading state, and backend-unavailable error state

Request categories, database seeding, category APIs, and the category-list UI are intentionally not implemented on this branch. They belong to later feature branches.

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
```

The local database is PostgreSQL at `localhost:5432`. The client reads `VITE_API_BASE_URL` from `client/.env`; its development value is `http://localhost:3000`. The database credentials are development-only values from `.env.example`; never commit either `.env` file or any real credentials.

## Run the foundation and health check

In separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Open the Vite URL shown in the client terminal. The page should show the TokTickIT heading, a Bootstrap-styled foundation card, and the live backend API status.

## Test and build

```bash
npm test
npm run build:client
npm run build:server
```
