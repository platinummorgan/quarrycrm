-- Ensure the contacts.notes column is TEXT
-- This migration is idempotent on PostgreSQL: ALTER COLUMN TYPE to TEXT will succeed if already TEXT.

ALTER TABLE IF EXISTS "contacts" ALTER COLUMN "notes" TYPE TEXT USING "notes"::text;

COMMENT ON COLUMN "contacts"."notes" IS 'Encrypted using XChaCha20-Poly1305 AEAD (format: v1:nonce:ciphertext:tag)';
