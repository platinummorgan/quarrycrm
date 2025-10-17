-- Create enum for organization plans
CREATE TYPE "OrganizationPlan" AS ENUM ('FREE', 'PRO', 'TEAM');

-- Add plan column to organizations with default FREE
ALTER TABLE "organizations"
ADD COLUMN "plan" "OrganizationPlan" NOT NULL DEFAULT 'FREE';
