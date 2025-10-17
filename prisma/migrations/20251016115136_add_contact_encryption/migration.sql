-- Add encrypted field and search hash columns to contacts
-- This migration adds support for field-level encryption using XChaCha20-Poly1305

-- Add notes field for encrypted notes
ALTER TABLE "contacts" ADD COLUMN "notes" TEXT;

-- Add search hash columns for encrypted fields
ALTER TABLE "contacts" ADD COLUMN "email_hash" TEXT;
ALTER TABLE "contacts" ADD COLUMN "phone_hash" TEXT;

-- Drop old email index (uses plaintext email)
DROP INDEX IF EXISTS "contacts_organizationId_email_idx";

-- Create new indexes using hash fields for efficient lookups
CREATE INDEX "contacts_organizationId_email_hash_idx" ON "contacts"("organizationId", "email_hash");
CREATE INDEX "contacts_organizationId_phone_hash_idx" ON "contacts"("organizationId", "phone_hash");

-- Add comments for documentation
COMMENT ON COLUMN "contacts"."email" IS 'Encrypted using XChaCha20-Poly1305 AEAD (format: v1:nonce:ciphertext:tag)';
COMMENT ON COLUMN "contacts"."phone" IS 'Encrypted using XChaCha20-Poly1305 AEAD (format: v1:nonce:ciphertext:tag)';
COMMENT ON COLUMN "contacts"."notes" IS 'Encrypted using XChaCha20-Poly1305 AEAD (format: v1:nonce:ciphertext:tag)';
COMMENT ON COLUMN "contacts"."email_hash" IS 'BLAKE2b-256 hash with salt for searchable encryption (deterministic)';
COMMENT ON COLUMN "contacts"."phone_hash" IS 'BLAKE2b-256 hash with salt for searchable encryption (deterministic)';
