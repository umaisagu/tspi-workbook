-- Workbook v3.0 PHASES: Compile becomes BUILD (build & static analysis), Acceptance Test becomes UAT (client
-- acceptance test); AIGEN (AI-assisted generation), WT (widget test) and CICD (CI/CD pipeline) are added.
-- Renaming keeps every existing LOGT, LOGD, TASK, QualityPlan row and hidden-phase setting.
ALTER TYPE "Phase" RENAME VALUE 'COMPILE' TO 'BUILD';
ALTER TYPE "Phase" RENAME VALUE 'AT' TO 'UAT';
ALTER TYPE "Phase" ADD VALUE 'AIGEN' AFTER 'CODE';
ALTER TYPE "Phase" ADD VALUE 'WT' AFTER 'UT';
ALTER TYPE "Phase" ADD VALUE 'CICD' AFTER 'IT';
