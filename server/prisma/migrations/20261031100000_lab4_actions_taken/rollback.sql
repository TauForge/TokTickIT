-- Manual rollback for 20261031100000_lab4_actions_taken (not run by prisma migrate).
-- Drops everything the migration added; Lab 1-3 data is untouched. Destroys any Actions Taken rows.
-- After running it against a real database, remove the row for this migration from _prisma_migrations.
BEGIN;
DROP TABLE "ActionTaken";
ALTER TABLE "Ticket" DROP COLUMN "version";
COMMIT;
