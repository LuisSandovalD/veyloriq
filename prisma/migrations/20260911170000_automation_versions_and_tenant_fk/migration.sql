CREATE UNIQUE INDEX "Automation_organizationId_id_key"
ON "Automation"("organizationId", "id");

ALTER TABLE "AutomationRun"
DROP CONSTRAINT "AutomationRun_automationId_fkey";

ALTER TABLE "AutomationRun"
ADD CONSTRAINT "AutomationRun_organizationId_automationId_fkey"
FOREIGN KEY ("organizationId", "automationId")
REFERENCES "Automation"("organizationId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AutomationVersion" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationVersion_organizationId_automationId_version_key"
ON "AutomationVersion"("organizationId", "automationId", "version");

CREATE INDEX "AutomationVersion_organizationId_automationId_createdAt_idx"
ON "AutomationVersion"("organizationId", "automationId", "createdAt");

ALTER TABLE "AutomationVersion"
ADD CONSTRAINT "AutomationVersion_organizationId_automationId_fkey"
FOREIGN KEY ("organizationId", "automationId")
REFERENCES "Automation"("organizationId", "id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "AutomationVersion" (
  "id", "organizationId", "automationId", "version", "snapshot", "createdBy", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  "organizationId",
  "id",
  "version",
  jsonb_build_object(
    'name', "name",
    'trigger', "trigger",
    'conditions', "conditions",
    'actions', "actions",
    'active', "active",
    'maxDepth', "maxDepth"
  ),
  'migration',
  "createdAt"
FROM "Automation";
