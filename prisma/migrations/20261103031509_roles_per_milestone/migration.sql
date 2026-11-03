-- Workbook v3.0 ROLES: role assignments per milestone.
-- Existing assignments are copied into every milestone of the team's semester, so nothing changes until a team edits a milestone.
ALTER TABLE "RoleAssignment" ADD COLUMN "milestoneId" TEXT;
ALTER TABLE "RoleAssignment" DROP CONSTRAINT "RoleAssignment_pkey";

INSERT INTO "RoleAssignment" ("membershipId", "role", "milestoneId", "createdAt", "createdById")
SELECT ra."membershipId", ra."role", m."id", ra."createdAt", ra."createdById"
FROM "RoleAssignment" ra
JOIN "Membership" ms ON ms."id" = ra."membershipId"
JOIN "Team" t ON t."id" = ms."teamId"
JOIN "LabGroup" g ON g."id" = t."labGroupId"
JOIN "Milestone" m ON m."semesterId" = g."semesterId"
WHERE ra."milestoneId" IS NULL;

DELETE FROM "RoleAssignment" WHERE "milestoneId" IS NULL;

ALTER TABLE "RoleAssignment" ALTER COLUMN "milestoneId" SET NOT NULL;
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("membershipId", "role", "milestoneId");
CREATE INDEX "RoleAssignment_milestoneId_idx" ON "RoleAssignment"("milestoneId");
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
