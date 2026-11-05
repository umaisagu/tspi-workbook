-- CreateEnum
CREATE TYPE "LectureStatus" AS ENUM ('DELIVERED', 'CURRENT', 'PLANNED');

-- CreateEnum
CREATE TYPE "ResourceKind" AS ENUM ('SLIDES', 'COMPANION', 'VIDEO', 'QUIZ', 'HANDOUT', 'FILE');

-- CreateTable
CREATE TABLE "Lecture" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kicker" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "weekNumber" INTEGER,
    "order" INTEGER NOT NULL,
    "status" "LectureStatus" NOT NULL DEFAULT 'PLANNED',
    "covers" TEXT[],
    "parts" JSONB,
    "activities" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureResource" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "kind" "ResourceKind" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "fileName" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "LectureResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureCheck" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "answerIndex" INTEGER NOT NULL,
    "whenRight" TEXT NOT NULL,
    "whenWrong" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "LectureCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureView" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstOpenedAt" TIMESTAMP(3) NOT NULL,
    "lastOpenedAt" TIMESTAMP(3) NOT NULL,
    "openCount" INTEGER NOT NULL DEFAULT 1,
    "answeredAt" TIMESTAMP(3),
    "answerIndex" INTEGER,
    "correct" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "LectureView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lecture_semesterId_order_idx" ON "Lecture"("semesterId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Lecture_semesterId_code_key" ON "Lecture"("semesterId", "code");

-- CreateIndex
CREATE INDEX "LectureResource_lectureId_order_idx" ON "LectureResource"("lectureId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LectureCheck_lectureId_key" ON "LectureCheck"("lectureId");

-- CreateIndex
CREATE INDEX "LectureView_userId_idx" ON "LectureView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LectureView_lectureId_userId_key" ON "LectureView"("lectureId", "userId");

-- AddForeignKey
ALTER TABLE "Lecture" ADD CONSTRAINT "Lecture_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureResource" ADD CONSTRAINT "LectureResource_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureCheck" ADD CONSTRAINT "LectureCheck_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureView" ADD CONSTRAINT "LectureView_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureView" ADD CONSTRAINT "LectureView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
