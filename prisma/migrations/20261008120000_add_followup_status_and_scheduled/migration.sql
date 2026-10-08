-- Add FollowUpStatus enum
DO $$ BEGIN
    CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new nullable fields to FollowUp
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "status" "FollowUpStatus" DEFAULT 'PENDING';
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);
ALTER TABLE "FollowUp" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

-- Make occurredAt nullable
ALTER TABLE "FollowUp" ALTER COLUMN "occurredAt" DROP NOT NULL;

-- Make notes nullable
ALTER TABLE "FollowUp" ALTER COLUMN "notes" DROP NOT NULL;

-- Add foreign key for createdById
DO $$ BEGIN
    ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS "FollowUp_createdById_idx" ON "FollowUp"("createdById");
CREATE INDEX IF NOT EXISTS "FollowUp_status_idx" ON "FollowUp"("status");
CREATE INDEX IF NOT EXISTS "FollowUp_scheduledAt_idx" ON "FollowUp"("scheduledAt");
CREATE INDEX IF NOT EXISTS "FollowUp_createdById_status_scheduledAt_idx" ON "FollowUp"("createdById", "status", "scheduledAt");

-- Backfill existing records
UPDATE "FollowUp"
SET
    "createdById" = (SELECT "createdById" FROM "Lead" WHERE "Lead"."id" = "FollowUp"."leadId"),
    "status" = 'COMPLETED',
    "scheduledAt" = "occurredAt",
    "completedAt" = "occurredAt"
WHERE "createdById" IS NULL;

-- Remove old index on occurredAt if it exists
DROP INDEX IF EXISTS "FollowUp_occurredAt_idx";
