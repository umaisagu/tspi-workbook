-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETE', 'CARRIED_OVER', 'CANCELLED');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "code" TEXT,
ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "planWeek" INTEGER,
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'PLANNED';

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing data: a task with a completion date is Complete; Task IDs T01, T02… per team in plan order.
UPDATE "Task" SET "status" = 'COMPLETE' WHERE "completedOn" IS NOT NULL;
UPDATE "Task" AS t SET "code" = 'T' || lpad(x.n::text, 2, '0')
FROM (SELECT "id", row_number() OVER (PARTITION BY "teamId" ORDER BY "deletedAt" NULLS FIRST, "order", "id") AS n FROM "Task") AS x
WHERE x."id" = t."id";
