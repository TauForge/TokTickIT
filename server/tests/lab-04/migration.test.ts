import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";
import { prisma } from "../../src/prisma";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../prisma/migrations");
const LAB4_DIR = readdirSync(MIGRATIONS_DIR).find((d) => d.endsWith("_lab4_actions_taken")) ?? "missing_lab4_dir";
const INDEX_DIR = readdirSync(MIGRATIONS_DIR).find((d) => d.endsWith("_lab4_dashboard_indexes")) ?? "missing_index_dir";
const SCRATCH_DB = "toktickit_mig_scratch_test";

const baseUrl = new URL(process.env.DATABASE_URL!);
const adminUrl = new URL(baseUrl.toString());
adminUrl.pathname = "/postgres";
const scratchUrl = new URL(baseUrl.toString());
scratchUrl.pathname = `/${SCRATCH_DB}`;

function psql(url: URL, args: string[]): string {
  return execFileSync("psql", [url.toString().split("?")[0], "-v", "ON_ERROR_STOP=1", "-X", "-q", "-t", "-A", ...args], {
    encoding: "utf8",
  }).trim();
}
const sql = (query: string) => psql(scratchUrl, ["-c", query]);
const file = (f: string) => psql(scratchUrl, ["-f", path.join(MIGRATIONS_DIR, f)]);
const shape = () =>
  sql(`SELECT 'col:' || table_name || '.' || column_name || ':' || data_type || ':' || coalesce(column_default,'') FROM information_schema.columns
       WHERE table_schema='public' UNION ALL
       SELECT 'idx:' || indexname FROM pg_indexes WHERE schemaname='public' UNION ALL
       SELECT 'tbl:' || table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`);

let lab3Shape = "";

beforeAll(() => {
  psql(adminUrl, ["-c", `DROP DATABASE IF EXISTS ${SCRATCH_DB}`]);
  psql(adminUrl, ["-c", `CREATE DATABASE ${SCRATCH_DB}`]);
  const priors = readdirSync(MIGRATIONS_DIR)
    .filter((d) => d !== LAB4_DIR && !d.includes("migration_lock") && /^\d{14}_/.test(d) && d < LAB4_DIR)
    .sort();
  for (const dir of priors) file(`${dir}/migration.sql`);
  sql(`INSERT INTO "User"(email,"passwordHash","displayName",role) VALUES ('legacy@x.dev','h','Legacy','REQUESTER')`);
  sql(`INSERT INTO "Category"(name) VALUES ('Legacy cat') ON CONFLICT DO NOTHING`);
  sql(`INSERT INTO "Ticket"(id,"ticketNumber",summary,description,"requestedPriority","itPriority","updatedAt","requesterId","categoryId")
       SELECT 'legacy-t1','TKT-2026-900001','s','d','LOW','LOW',now(),u.id,c.id FROM "User" u, "Category" c WHERE u.email='legacy@x.dev' LIMIT 1`);
  lab3Shape = shape();
}, 60_000);

afterAll(() => {
  psql(adminUrl, ["-c", `DROP DATABASE IF EXISTS ${SCRATCH_DB}`]);
});

describe("MIG-01: migration on a Lab 3 database (AC-23, BR-23)", () => {
  it("applies additively: no row lost, legacy Tickets have version 0 and zero Actions", () => {
    const before = sql(`SELECT (SELECT count(*) FROM "User") || ',' || (SELECT count(*) FROM "Ticket")`);
    file(`${LAB4_DIR}/migration.sql`);
    expect(sql(`SELECT (SELECT count(*) FROM "User") || ',' || (SELECT count(*) FROM "Ticket")`)).toBe(before);
    expect(sql(`SELECT version FROM "Ticket" WHERE id='legacy-t1'`)).toBe("0");
    expect(sql(`SELECT count(*) FROM "ActionTaken"`)).toBe("0");
  });

  it("creates the unique (performedById, idempotencyKey) pair and RESTRICT foreign keys", () => {
    expect(sql(`SELECT count(*) FROM pg_indexes WHERE indexname='ActionTaken_performedById_idempotencyKey_key'`)).toBe("1");
    const rules = sql(`SELECT string_agg(delete_rule, ',') FROM information_schema.referential_constraints WHERE constraint_name LIKE 'ActionTaken_%'`);
    expect(rules).toBe("RESTRICT,RESTRICT");
  });

  it("is recorded in the test database through prisma migrate deploy", async () => {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM _prisma_migrations WHERE migration_name = ${LAB4_DIR}`;
    expect(rows).toHaveLength(1);
  });
});

describe("MIG-03: dashboard index migration (specification section 8)", () => {
  const names = ["Ticket_ownerId_status_idx", "Ticket_updatedAt_idx", "ActionTaken_performedById_actionAt_idx"];
  const present = () => Number(sql(`SELECT count(*) FROM pg_indexes WHERE indexname IN (${names.map((n) => `'${n}'`).join(",")})`));

  it("adds exactly the three indexes without touching rows, and its rollback removes them", () => {
    const afterLab4 = shape();
    const rows = sql(`SELECT (SELECT count(*) FROM "Ticket") || ',' || (SELECT count(*) FROM "User")`);
    file(`${INDEX_DIR}/migration.sql`);
    expect(present()).toBe(3);
    expect(sql(`SELECT (SELECT count(*) FROM "Ticket") || ',' || (SELECT count(*) FROM "User")`)).toBe(rows);
    file(`${INDEX_DIR}/rollback.sql`);
    expect(present()).toBe(0);
    expect(shape()).toBe(afterLab4);
  });

  it("is recorded in the test database through prisma migrate deploy", async () => {
    const recorded = await prisma.$queryRaw<{ migration_name: string }[]>`SELECT migration_name FROM _prisma_migrations WHERE migration_name = ${INDEX_DIR}`;
    expect(recorded).toHaveLength(1);
  });
});

describe("MIG-02: rollback script on a scratch database (AC-23)", () => {
  it("returns the schema to the Lab 3 shape and keeps old data intact", () => {
    sql(`INSERT INTO "ActionTaken"(id,"ticketId","performedById","actionAt",description,result,"updatedAt")
         SELECT 'a1','legacy-t1',u.id,now(),'d','r',now() FROM "User" u LIMIT 1`);
    file(`${LAB4_DIR}/rollback.sql`);
    expect(shape()).toBe(lab3Shape);
    expect(sql(`SELECT count(*) FROM "Ticket" WHERE id='legacy-t1'`)).toBe("1");
    expect(sql(`SELECT count(*) FROM "User"`)).toBe("1");
  });
});
