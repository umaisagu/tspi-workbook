-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('LECTURER', 'DEMONSTRATOR', 'STUDENT');

-- CreateEnum
CREATE TYPE "TspiRole" AS ENUM ('TEAM_LEADER', 'DEVELOPMENT_MANAGER', 'PLANNING_MANAGER', 'QUALITY_PROCESS_MANAGER', 'SUPPORT_MANAGER');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('MGMT', 'STRAT', 'PLAN', 'REQ', 'STP', 'REQINSP', 'HLD', 'ITP', 'HLDINSP', 'DLD', 'DLDR', 'TD', 'DLDINSP', 'CODE', 'CR', 'COMPILE', 'CODEINSP', 'UT', 'IT', 'ST', 'DOC', 'PM', 'AT', 'PL');

-- CreateEnum
CREATE TYPE "SizeMeasure" AS ENUM ('TEXT_PAGES', 'REQ_PAGES', 'HLD_PAGES', 'DLD_LINES', 'LOC');

-- CreateEnum
CREATE TYPE "ComponentKind" AS ENUM ('ASSEMBLY', 'PART');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('UNIT', 'WIDGET', 'INTEGRATION');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('PASS', 'FAIL', 'BLOCKED', 'NOT_RUN');

-- CreateEnum
CREATE TYPE "ChangeStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('SI', 'LOGT', 'LOGD', 'LOGAI', 'PEER', 'TASK', 'SCHEDULE', 'LOGTEST', 'WEEK', 'SUMS', 'SUMP', 'SUMQ', 'SUMTASK', 'CCR');

-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('LOW_SHARE', 'INACTIVE', 'HOURS_NO_OUTPUT', 'BACKFILL', 'PEER_MISMATCH', 'MISSING_FORMS');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "GitHubActivityKind" AS ENUM ('COMMIT', 'PULL_REQUEST', 'REVIEW');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "appRole" "AppRole" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "week1Monday" DATE NOT NULL,
    "weekCount" INTEGER NOT NULL DEFAULT 15,
    "breakWeeks" INTEGER[],
    "hiddenPhases" "Phase"[],
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "requiredForms" "FormType"[],
    "peerRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabGroup" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schedule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "LabGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabGroupDemonstrator" (
    "labGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "LabGroupDemonstrator_pkey" PRIMARY KEY ("labGroupId","userId")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "labGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectTitle" TEXT,
    "clientName" TEXT,
    "repoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "membershipId" TEXT NOT NULL,
    "role" "TspiRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("membershipId","role")
);

-- CreateTable
CREATE TABLE "StudentInfo" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "matricNo" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "programme" TEXT NOT NULL,
    "yearOfStudy" INTEGER NOT NULL,
    "creditsRegistered" INTEGER NOT NULL,
    "expectedGradSemester" INTEGER,
    "expectedGradYear" INTEGER,
    "phone" TEXT,
    "githubUsername" TEXT,
    "skills" JSONB NOT NULL,
    "resources" JSONB NOT NULL,
    "experience" TEXT,
    "previousProjects" TEXT,
    "leadership" TEXT,
    "clientContact" TEXT,
    "appIdea" TEXT,
    "aiFeatureIdea" TEXT,
    "preferredTeammates" TEXT,
    "residence" TEXT,
    "ownTransport" BOOLEAN,
    "meetingAvailability" TEXT[],
    "weeklyCommitments" JSONB NOT NULL,
    "commitmentNotes" TEXT,
    "preferredMeetingSlot" TEXT,
    "rolePreferences" JSONB NOT NULL,
    "declaredAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "StudentInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startMin" INTEGER NOT NULL,
    "stopMin" INTEGER NOT NULL,
    "interruptMin" INTEGER NOT NULL DEFAULT 0,
    "deltaMin" INTEGER NOT NULL,
    "phase" "Phase" NOT NULL,
    "componentId" TEXT,
    "taskId" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefectLog" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "number" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "componentId" TEXT,
    "phaseInjected" "Phase" NOT NULL,
    "phaseRemoved" "Phase" NOT NULL,
    "fixTimeMin" INTEGER NOT NULL,
    "fixRefId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "DefectLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLog" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "module" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptSpec" TEXT NOT NULL,
    "outputSummary" TEXT NOT NULL,
    "humanRefinement" TEXT NOT NULL,
    "testEvidence" TEXT NOT NULL,
    "prUrl" TEXT,
    "reviewerMembershipId" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "AiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerEvaluation" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "evaluateeId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "PeerEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ComponentKind" NOT NULL DEFAULT 'ASSEMBLY',
    "parentId" TEXT,
    "ownerMembershipId" TEXT,
    "sizeMeasure" "SizeMeasure" NOT NULL DEFAULT 'LOC',
    "planBase" INTEGER NOT NULL DEFAULT 0,
    "planDeleted" INTEGER NOT NULL DEFAULT 0,
    "planModified" INTEGER NOT NULL DEFAULT 0,
    "planAdded" INTEGER NOT NULL DEFAULT 0,
    "planReused" INTEGER NOT NULL DEFAULT 0,
    "planNewReuse" INTEGER NOT NULL DEFAULT 0,
    "actBase" INTEGER NOT NULL DEFAULT 0,
    "actDeleted" INTEGER NOT NULL DEFAULT 0,
    "actModified" INTEGER NOT NULL DEFAULT 0,
    "actAdded" INTEGER NOT NULL DEFAULT 0,
    "actReused" INTEGER NOT NULL DEFAULT 0,
    "actNewReuse" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "phase" "Phase" NOT NULL,
    "componentId" TEXT,
    "assigneeMembershipId" TEXT,
    "planHours" DECIMAL(8,2) NOT NULL,
    "estSize" DECIMAL(10,2),
    "sizeMeasure" "SizeMeasure",
    "rate" DECIMAL(10,2),
    "completedOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleWeek" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "planHours" DECIMAL(6,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "ScheduleWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityPlan" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "componentId" TEXT,
    "phase" "Phase" NOT NULL,
    "planInjectionRate" DECIMAL(8,3),
    "planYield" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "QualityPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestLog" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "authorMembershipId" TEXT NOT NULL,
    "testCode" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TestType" NOT NULL,
    "expected" TEXT NOT NULL,
    "actual" TEXT,
    "status" "TestStatus" NOT NULL DEFAULT 'NOT_RUN',
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "TestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "tasksCompleted" TEXT,
    "risksIssues" TEXT,
    "nextWeekPlan" TEXT,
    "snapshot" JSONB,
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "requesterMembershipId" TEXT NOT NULL,
    "componentId" TEXT,
    "description" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "impact" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ChangeStatus" NOT NULL DEFAULT 'SUBMITTED',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormComment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "formType" "FormType" NOT NULL,
    "recordId" TEXT,
    "membershipId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerNote" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "membershipId" TEXT,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LecturerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringSettings" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "thresholds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "MonitoringSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlagReview" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "type" "FlagType" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" "FlagStatus" NOT NULL,
    "reason" TEXT,
    "evidence" JSONB NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlagReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubActivity" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "membershipId" TEXT,
    "login" TEXT NOT NULL,
    "kind" "GitHubActivityKind" NOT NULL,
    "externalId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubSync" (
    "teamId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubSync_pkey" PRIMARY KEY ("teamId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "RateLimit_windowStart_idx" ON "RateLimit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_semesterId_code_key" ON "Milestone"("semesterId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LabGroup_semesterId_name_key" ON "LabGroup"("semesterId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_labGroupId_name_key" ON "Team"("labGroupId", "name");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_teamId_userId_key" ON "Membership"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentInfo_membershipId_key" ON "StudentInfo"("membershipId");

-- CreateIndex
CREATE INDEX "TimeLog_membershipId_date_idx" ON "TimeLog"("membershipId", "date");

-- CreateIndex
CREATE INDEX "TimeLog_taskId_idx" ON "TimeLog"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "DefectLog_membershipId_number_key" ON "DefectLog"("membershipId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "AiLog_membershipId_code_key" ON "AiLog"("membershipId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PeerEvaluation_milestoneId_evaluatorId_evaluateeId_key" ON "PeerEvaluation"("milestoneId", "evaluatorId", "evaluateeId");

-- CreateIndex
CREATE UNIQUE INDEX "Component_teamId_name_key" ON "Component"("teamId", "name");

-- CreateIndex
CREATE INDEX "Task_teamId_idx" ON "Task"("teamId");

-- CreateIndex
CREATE INDEX "ScheduleWeek_teamId_week_idx" ON "ScheduleWeek"("teamId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleWeek_membershipId_week_key" ON "ScheduleWeek"("membershipId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "QualityPlan_teamId_componentId_phase_key" ON "QualityPlan"("teamId", "componentId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "TestLog_teamId_testCode_key" ON "TestLog"("teamId", "testCode");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_teamId_week_key" ON "WeeklyReport"("teamId", "week");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeRequest_teamId_number_key" ON "ChangeRequest"("teamId", "number");

-- CreateIndex
CREATE INDEX "FormComment_teamId_formType_idx" ON "FormComment"("teamId", "formType");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringSettings_semesterId_key" ON "MonitoringSettings"("semesterId");

-- CreateIndex
CREATE INDEX "FlagReview_membershipId_type_periodKey_idx" ON "FlagReview"("membershipId", "type", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubActivity_externalId_key" ON "GitHubActivity"("externalId");

-- CreateIndex
CREATE INDEX "GitHubActivity_teamId_occurredAt_idx" ON "GitHubActivity"("teamId", "occurredAt");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabGroup" ADD CONSTRAINT "LabGroup_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabGroupDemonstrator" ADD CONSTRAINT "LabGroupDemonstrator_labGroupId_fkey" FOREIGN KEY ("labGroupId") REFERENCES "LabGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabGroupDemonstrator" ADD CONSTRAINT "LabGroupDemonstrator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_labGroupId_fkey" FOREIGN KEY ("labGroupId") REFERENCES "LabGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInfo" ADD CONSTRAINT "StudentInfo_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefectLog" ADD CONSTRAINT "DefectLog_fixRefId_fkey" FOREIGN KEY ("fixRefId") REFERENCES "DefectLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLog" ADD CONSTRAINT "AiLog_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLog" ADD CONSTRAINT "AiLog_reviewerMembershipId_fkey" FOREIGN KEY ("reviewerMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerEvaluation" ADD CONSTRAINT "PeerEvaluation_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerEvaluation" ADD CONSTRAINT "PeerEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerEvaluation" ADD CONSTRAINT "PeerEvaluation_evaluateeId_fkey" FOREIGN KEY ("evaluateeId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_ownerMembershipId_fkey" FOREIGN KEY ("ownerMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeMembershipId_fkey" FOREIGN KEY ("assigneeMembershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleWeek" ADD CONSTRAINT "ScheduleWeek_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleWeek" ADD CONSTRAINT "ScheduleWeek_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityPlan" ADD CONSTRAINT "QualityPlan_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityPlan" ADD CONSTRAINT "QualityPlan_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestLog" ADD CONSTRAINT "TestLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestLog" ADD CONSTRAINT "TestLog_authorMembershipId_fkey" FOREIGN KEY ("authorMembershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_requesterMembershipId_fkey" FOREIGN KEY ("requesterMembershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormComment" ADD CONSTRAINT "FormComment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormComment" ADD CONSTRAINT "FormComment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormComment" ADD CONSTRAINT "FormComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerNote" ADD CONSTRAINT "LecturerNote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerNote" ADD CONSTRAINT "LecturerNote_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerNote" ADD CONSTRAINT "LecturerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringSettings" ADD CONSTRAINT "MonitoringSettings_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagReview" ADD CONSTRAINT "FlagReview_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubActivity" ADD CONSTRAINT "GitHubActivity_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubActivity" ADD CONSTRAINT "GitHubActivity_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSync" ADD CONSTRAINT "GitHubSync_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
