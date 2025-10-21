-- Align activities table with current Prisma schema
ALTER TABLE "activities"
    ADD COLUMN "subject" TEXT,
    ADD COLUMN "dueDate" TIMESTAMP(3),
    ADD COLUMN "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "body" TEXT;
