-- Enforce that a membership can only reference a role from the same tenant.
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_roleId_fkey";
ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_organizationId_roleId_fkey"
  FOREIGN KEY ("organizationId", "roleId")
  REFERENCES "Role"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve actor classification and terminal outbox failures as queryable data.
ALTER TABLE "AuditEvent" ADD COLUMN "actorType" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "OutboxEvent" ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "OutboxEvent" ADD COLUMN "failedAt" TIMESTAMP(3);

DROP INDEX "OutboxEvent_processedAt_availableAt_idx";
CREATE INDEX "OutboxEvent_processedAt_failedAt_availableAt_idx"
  ON "OutboxEvent"("processedAt", "failedAt", "availableAt");
