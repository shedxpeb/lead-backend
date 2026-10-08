-- Create RefreshSession table
CREATE TABLE IF NOT EXISTS "RefreshSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "RefreshSession_userId_idx" ON "RefreshSession"("userId");
CREATE INDEX IF NOT EXISTS "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

-- Add foreign key to User
DO $$ BEGIN
    ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add relation to User model (this requires updating the User table which we'll do manually)
-- ALTER TABLE "User" ADD COLUMN "refreshSessions" TEXT[] DEFAULT ARRAY[]::TEXT[];
