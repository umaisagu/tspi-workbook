-- AlterEnum
ALTER TYPE "FormType" ADD VALUE 'MYSUM';

-- CreateTable
CREATE TABLE "MemberSize" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "planLoc" INTEGER,
    "actLoc" INTEGER,
    "planPages" INTEGER,
    "actPages" INTEGER,
    "planScreens" INTEGER,
    "actScreens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "MemberSize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberSize_membershipId_key" ON "MemberSize"("membershipId");

-- AddForeignKey
ALTER TABLE "MemberSize" ADD CONSTRAINT "MemberSize_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
