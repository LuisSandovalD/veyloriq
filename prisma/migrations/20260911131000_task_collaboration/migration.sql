-- Add task ownership and tenant-safe collaboration history.
ALTER TABLE "Task" ADD COLUMN "createdById" TEXT;

CREATE UNIQUE INDEX "Task_organizationId_id_key" ON "Task"("organizationId", "id");

CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskComment_organizationId_taskId_createdAt_idx" ON "TaskComment"("organizationId", "taskId", "createdAt");
CREATE INDEX "TaskEvent_organizationId_taskId_createdAt_idx" ON "TaskEvent"("organizationId", "taskId", "createdAt");

ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_organizationId_taskId_fkey" FOREIGN KEY ("organizationId", "taskId") REFERENCES "Task"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_organizationId_taskId_fkey" FOREIGN KEY ("organizationId", "taskId") REFERENCES "Task"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
