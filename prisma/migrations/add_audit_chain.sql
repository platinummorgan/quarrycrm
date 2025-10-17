-- Add blockchain-style audit chain fields to EventAudit
-- Migration: add_audit_chain

-- Add prevHash column (SHA-256 of previous record's selfHash, null for genesis)
ALTER TABLE "events_audit" ADD COLUMN "prevHash" TEXT;

-- Add selfHash column (SHA-256 of this record's canonicalized payload)
ALTER TABLE "events_audit" ADD COLUMN "selfHash" TEXT NOT NULL DEFAULT '';

-- Add composite index for chain traversal
CREATE INDEX "events_audit_organizationId_createdAt_idx" ON "events_audit"("organizationId", "createdAt");

-- Add comments
COMMENT ON COLUMN "events_audit"."prevHash" IS 'SHA-256 hash of previous record selfHash (null for genesis record)';
COMMENT ON COLUMN "events_audit"."selfHash" IS 'SHA-256 hash of canonicalized record payload';
