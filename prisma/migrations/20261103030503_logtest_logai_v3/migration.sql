-- CreateEnum
CREATE TYPE "AiVerdict" AS ENUM ('APPROVED', 'APPROVED_WITH_CHANGES', 'CHANGES_REQUESTED', 'REJECTED', 'PENDING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TestType" ADD VALUE 'MANUAL';
ALTER TYPE "TestType" ADD VALUE 'ACCEPTANCE';
ALTER TYPE "TestType" ADD VALUE 'REGRESSION';
ALTER TYPE "TestType" ADD VALUE 'PERFORMANCE';
ALTER TYPE "TestType" ADD VALUE 'SECURITY';

-- AlterTable
ALTER TABLE "AiLog" ADD COLUMN     "commitRef" TEXT,
ADD COLUMN     "feature" TEXT,
ADD COLUMN     "linesGenerated" INTEGER,
ADD COLUMN     "linesKept" INTEGER,
ADD COLUMN     "testStatus" "TestStatus",
ADD COLUMN     "testsWritten" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verdict" "AiVerdict" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "model" DROP NOT NULL,
ALTER COLUMN "outputSummary" DROP NOT NULL,
ALTER COLUMN "humanRefinement" DROP NOT NULL,
ALTER COLUMN "testEvidence" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TestLog" ADD COLUMN     "automated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defectRef" TEXT;

-- Entries approved before v3.0 keep their approval as the verdict "Approved".
UPDATE "AiLog" SET "verdict" = 'APPROVED' WHERE "approved" = true;
