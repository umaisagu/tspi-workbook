-- CreateEnum
CREATE TYPE "DefectSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'COSMETIC');

-- AlterTable
ALTER TABLE "DefectLog" ADD COLUMN     "fixReference" TEXT,
ADD COLUMN     "fromAi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "severity" "DefectSeverity" NOT NULL DEFAULT 'MINOR';

-- AlterTable
ALTER TABLE "TimeLog" ADD COLUMN     "aiUsed" BOOLEAN NOT NULL DEFAULT false;
