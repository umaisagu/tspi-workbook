-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SizeMeasure" ADD VALUE 'SCREENS';
ALTER TYPE "SizeMeasure" ADD VALUE 'WIDGETS';
ALTER TYPE "SizeMeasure" ADD VALUE 'API_ENDPOINTS';
ALTER TYPE "SizeMeasure" ADD VALUE 'TEST_CASES';

-- AlterTable
ALTER TABLE "QualityPlan" ADD COLUMN     "plannedInjected" DECIMAL(8,2),
ADD COLUMN     "plannedRemoved" DECIMAL(8,2);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "coverage" DECIMAL(5,4);
