-- Add export job fields and purge tracking to Organization
-- Migration: add_export_and_purge_fields

-- Update Organization table for better soft delete tracking
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "scheduledPurgeAt" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

-- Add comments
COMMENT ON COLUMN "organizations"."deletedAt" IS 'Timestamp when organization was soft-deleted';
COMMENT ON COLUMN "organizations"."scheduledPurgeAt" IS 'Timestamp when organization will be permanently purged (30 days after deletion)';
COMMENT ON COLUMN "organizations"."deletedBy" IS 'User ID who initiated deletion';

-- Create index for finding organizations scheduled for purge
CREATE INDEX IF NOT EXISTS "organizations_scheduledPurgeAt_idx" ON "organizations"("scheduledPurgeAt") WHERE "scheduledPurgeAt" IS NOT NULL;
