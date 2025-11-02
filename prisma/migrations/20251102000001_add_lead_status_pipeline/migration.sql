-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('GOOGLE', 'REFERRAL', 'YARD_SIGN', 'FACEBOOK', 'REPEAT_CUSTOMER', 'OTHER');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN "status" "LeadStatus" DEFAULT 'NEW',
ADD COLUMN "jobType" TEXT,
ADD COLUMN "estimatedValue" DECIMAL(10,2),
ADD COLUMN "leadSource" "LeadSource";
