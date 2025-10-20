-- Add missing onboarding fields to org_members table
-- This script is safe to run multiple times (idempotent)

-- Add onboarding_dismissed column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'org_members' 
        AND column_name = 'onboarding_dismissed'
    ) THEN
        ALTER TABLE org_members 
        ADD COLUMN onboarding_dismissed BOOLEAN NOT NULL DEFAULT false;
        
        RAISE NOTICE 'Added onboarding_dismissed column';
    ELSE
        RAISE NOTICE 'onboarding_dismissed column already exists';
    END IF;
END $$;

-- Add onboarding_progress column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'org_members' 
        AND column_name = 'onboarding_progress'
    ) THEN
        ALTER TABLE org_members 
        ADD COLUMN onboarding_progress JSONB NOT NULL DEFAULT '{}'::jsonb;
        
        RAISE NOTICE 'Added onboarding_progress column';
    ELSE
        RAISE NOTICE 'onboarding_progress column already exists';
    END IF;
END $$;
