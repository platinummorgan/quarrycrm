-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for fast text search on contacts
CREATE INDEX IF NOT EXISTS "contacts_search_idx" ON "contacts" USING GIN (
  (
    COALESCE("firstName", '') || ' ' || COALESCE("lastName", '') || ' ' || COALESCE("email", '')
  ) gin_trgm_ops
) WHERE "deletedAt" IS NULL;

-- Create GIN indexes for fast text search on companies
CREATE INDEX IF NOT EXISTS "companies_search_idx" ON "companies" USING GIN (
  (
    COALESCE("name", '') || ' ' || COALESCE("domain", '')
  ) gin_trgm_ops
) WHERE "deletedAt" IS NULL;

-- Create GIN indexes for fast text search on deals
CREATE INDEX IF NOT EXISTS "deals_search_idx" ON "deals" USING GIN (
  COALESCE("title", '') gin_trgm_ops
) WHERE "deletedAt" IS NULL;

-- Create GIN indexes for fast text search on activities
CREATE INDEX IF NOT EXISTS "activities_search_idx" ON "activities" USING GIN (
  COALESCE("description", '') gin_trgm_ops
) WHERE "deletedAt" IS NULL;