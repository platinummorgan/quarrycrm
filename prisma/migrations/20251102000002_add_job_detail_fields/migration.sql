-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_PAID', 'DEPOSIT_PAID', 'PAID_IN_FULL');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN "jobAddress" TEXT,
ADD COLUMN "scheduledStart" TIMESTAMP(3),
ADD COLUMN "scheduledEnd" TIMESTAMP(3),
ADD COLUMN "crewAssigned" TEXT,
ADD COLUMN "paymentStatus" "PaymentStatus" DEFAULT 'NOT_PAID';
