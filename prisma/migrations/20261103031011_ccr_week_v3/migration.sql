-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('REQUIREMENT', 'DESIGN', 'CODE', 'TEST', 'DOCUMENT', 'BUILD_CI');

-- AlterEnum
ALTER TYPE "ChangeStatus" ADD VALUE 'DEFERRED';

-- AlterTable
ALTER TABLE "ChangeRequest" ADD COLUMN     "changeType" "ChangeType",
ADD COLUMN     "estHours" DECIMAL(8,2),
ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reviewerMembershipId" TEXT;

-- AlterTable
ALTER TABLE "WeeklyReport" ADD COLUMN     "met" BOOLEAN,
ADD COLUMN     "present" INTEGER;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_reviewerMembershipId_fkey" FOREIGN KEY ("reviewerMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
