SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'org_members'
AND column_name IN ('onboarding_dismissed', 'onboarding_progress')
ORDER BY column_name;
