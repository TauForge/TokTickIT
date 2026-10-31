-- Lab 4 task 10c: dashboard indexes (specification section 8). Additive only; undo with rollback.sql in this folder.

-- CreateIndex
CREATE INDEX "Ticket_ownerId_status_idx" ON "Ticket"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Ticket_updatedAt_idx" ON "Ticket"("updatedAt");

-- CreateIndex
CREATE INDEX "ActionTaken_performedById_actionAt_idx" ON "ActionTaken"("performedById", "actionAt");
