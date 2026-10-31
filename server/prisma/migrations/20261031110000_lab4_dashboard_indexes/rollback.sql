-- Manual rollback for 20261031110000_lab4_dashboard_indexes (not run by prisma migrate).
-- Drops the three indexes this migration added and restores the Ticket ownerId index it removed; no data is touched.
-- After running it against a real database, remove the row for this migration from _prisma_migrations.
BEGIN;
CREATE INDEX "Ticket_ownerId_idx" ON "Ticket"("ownerId");
DROP INDEX "Ticket_ownerId_status_idx";
DROP INDEX "Ticket_updatedAt_idx";
DROP INDEX "ActionTaken_performedById_actionAt_idx";
COMMIT;
