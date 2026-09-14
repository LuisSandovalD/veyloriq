CREATE TABLE "ServiceHeartbeat" (
  "id" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceHeartbeat_pkey" PRIMARY KEY ("id")
);
