-- Manual rollback for 20261031110000_lab4_dashboard_indexes (not run by prisma migrate).
-- Drops only the three indexes this migration added; no data is touched.
-- After running it against a real database, remove the row for this migration from _prisma_migrations.
BEGIN;
DROP INDEX "Ticket_ownerId_status_idx";
DROP INDEX "Ticket_updatedAt_idx";
DROP INDEX "ActionTaken_performedById_actionAt_idx";
COMMIT;
