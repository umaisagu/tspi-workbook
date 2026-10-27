# TSPi Workbook — notes for Claude

Web replacement for the TSPi Excel workbook for TMA3084 Software Engineering Lab (UNIMAS).
Student teams (5–6) fill in TSPi forms; the lecturer monitors progress and individual contribution.
Source of truth for form fields and formulas: `/docs` (see `docs/workbook-formulas.md`).
If a doc conflicts with a request, ask before choosing.

## Session start (Claude Code on the web)

1. `service postgresql start`
2. Dev env vars come from the environment. If any are missing, `cp .env.example .env` and fill in
   (never commit `.env`).
3. `npm ci` (runs `prisma generate`), then `npm run db:deploy` (or `npm run db:migrate` when changing the schema).

## Commands

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Typecheck | `npm run typecheck` (prisma generate + next typegen + tsc) |
| Lint | `npm run lint` |
| Unit tests | `npm test` (Vitest; `lib/**/*.test.ts`, `components/**/*.test.ts`; config `vitest.config.mts`) |
| New migration (dev only) | `npm run db:migrate -- --name <name>` |
| Apply migrations | `npm run db:deploy` |
| Seed (dev only, wipes DB) | `npm run db:seed` — all seeded accounts use password `tspi-dev-2026`; log data is generated up to "today" (prisma/seed-logs.ts); GitHub activity is cached seed data for fictional repos (seed-github.ts) |
| Production build | `npm run build` = `prisma generate`, deploy-target check, `prisma migrate deploy`, mark, `next build` |
| First lecturer (production, once) | `npm run create-lecturer` |
| Backup (off-site copy) | `npm run backup` (pg_dump of `BACKUP_DATABASE_URL`/`DIRECT_URL` to `./backups`, git-ignored) |

Never run `migrate dev` or the seed against production. The seed refuses non-local hosts unless
`SEED_ALLOW_REMOTE=yes` (preview database only), and any database marked production (`AppMeta`).

## Stack and versions

- Next.js 16 (App Router, Turbopack). **Cache Components is off** (`cacheComponents: false`): every page is
  per-user. `middleware` is now `proxy.ts` (Node runtime). `params`/`searchParams` are Promises;
  use the generated `PageProps<"/route">`, `LayoutProps`, `RouteContext<"/api/...">` types.
  Next 16 docs are in `node_modules/next/dist/docs/` — read them before using unfamiliar APIs.
- React 19, Tailwind CSS 4, TypeScript strict (+ `noUncheckedIndexedAccess`), ESLint bans `any`.
- Prisma 7: generator `prisma-client` → `generated/prisma` (git-ignored). `prisma.config.ts` gives the CLI the direct
  connection (`DIRECT_URL`, or Neon's `DATABASE_URL_UNPOOLED`: `directDatabaseUrl()` in `lib/deploy/db-urls.ts`); the app
  uses `DATABASE_URL` (pooled) through a node-postgres `Pool` + `@prisma/adapter-pg` in `lib/db.ts`, registered with
  `attachDatabasePool` from `@vercel/functions` (Neon's guidance for Vercel Fluid compute; no-op elsewhere).
  CLI tools load `.env.local` then `.env` (`scripts/load-env.ts`), like Next.js; shell variables win.
- Neon CLI: `neon.ts` + `.neon` (git-ignored link to the org/project/branch) from `neon init`; `neon env pull`
  writes `.env.local`. This sandbox's network policy blocks `*.neon.tech`/`neon.com` unless allowed.
- Auth.js v5 (`next-auth@beta`), Credentials provider, JWT sessions. Every request re-loads the user
  (`lib/server/viewer.ts`): deactivated users and sessions older than the user's `sessionVersion`
  (bumped on password reset / role change) are rejected.
- Zod 4 schemas in `lib/schemas` are shared by client forms and API routes. Import `z` from `@/lib/schemas/zod`
  (jitless mode; a bare `"zod"` import is an ESLint error) — Zod's eval probe would violate the CSP.
- Vitest 4. npm 10 hits a peer-resolution bug when *adding* vitest; use `--legacy-peer-deps` for that
  one install. `npm ci` works normally.

## Folder conventions

```
app/(auth)/…            login, register, forgot-password, reset-password
app/(app)/…             signed-in pages (layout loads the user and nav)
app/api/…               route handlers; every handler wrapped in route() from lib/server/http.ts
components/charts       line-chart.tsx (SVG, crosshair tooltip, legend, direct labels, table view), bar-chart.tsx,
                        planning-charts.tsx; colours in colors.ts (plain module: server pages must not import
                        constants from "use client" files — they arrive as client references)
components/dashboard    completion-grid.tsx
lib/server/team-status.ts  dashboards + milestone view loader (completion, contribution, defects by phase)
components/ui|roster|admin|forms   forms/log-table.tsx = generic editable table (add/edit/delete, Zod inline validation, week/phase filters)
lib/forms.ts            form slugs/titles; AVAILABLE_FORMS lists the forms with pages
lib/server/forms/       access.ts (individualFormAccess / requireTeamForm), refs.ts (cross-record checks), loaders
lib/tsp/                pure TSPi formulas + tests (calendar, phases, roles, milestones, time, defects, ai-log, student-info,
                        earned-value (TASK/SCHEDULE/EV/predictions), sumtask, sizes (SUMS), quality (SUMP/SUMQ),
                        week (WEEK), peer (PEER), test-log, completion (milestone form status), contribution)
lib/monitoring/         pure contribution-flag logic + tests: settings.ts (thresholds), flags.ts, status.ts (team badge)
lib/github/             parse.ts (pure, tested: repo URL, pagination, payload schemas, counts), client.ts (REST fetch)
lib/export/             document.ts (pure, tested: title + sections of columns/rows), xlsx.ts (exceljs), pdf.ts (pdfkit)
lib/server/monitoring.ts   loadTeamMonitoring / loadClassOverview (flags + review status, contribution, heatmap)
lib/server/export/      sections.ts (per-form tables), contribution.ts (member report), access.ts, respond.ts
lib/server/github-sync.ts  syncTeam / syncBatch (cached in GitHubActivity, status in GitHubSync)
components/monitor      overview table, contribution table, heatmap + weekly completion, flag list, notes, exports, settings
lib/auth/               Auth.js config, permissions.ts (pure, tested), email/rate-limit helpers
lib/schemas/            Zod schemas (shared)
lib/server/             server-only data access, guards, audit helpers
prisma/                 schema, migrations, seed.ts
lib/security/csp.ts     Content-Security-Policy builder (nonce per request, set in proxy.ts) + tests
lib/deploy/             target.ts (environment marker rules), backup.ts (backup helpers), with tests
lib/server/maintenance.ts  cleanup for the daily cron (old rate-limit rows, reset tokens)
scripts/                create-lecturer.ts, deploy-target.ts (build guard), backup.ts, extract-workbook.py, db-client.ts
docs/                   course reference material (do not edit) + workbook-formulas.md
```

- All formulas live in pure functions in `/lib/tsp`, all flag logic in `/lib/monitoring`, each with tests.
- Calculated values (delta time, PV, EV, SUMS/SUMP/SUMQ/SUMTASK) are computed, never typed or trusted from clients.
- Audit trail: every model has `createdAt/updatedAt/createdById/updatedById` (use `created()`/`updated()`
  from `lib/server/audit.ts`). Form rows are soft-deleted (`deletedAt/deletedById`); filter them out.
- API errors: throw `HttpError` (or `forbidden()/notFound()`); `route()` turns them into JSON and hides
  unexpected errors (no stack traces to users). Validation errors return `{ error, fields }`.
- Dates: log dates are `@db.Date` (UTC midnight). Course time zone is Asia/Kuching (UTC+8); semester weeks
  come from `Semester.week1Monday` via `lib/tsp/calendar.ts`.

## Role rules (lib/auth/permissions.ts is the only place access is decided)

- **Lecturer** (`AppRole.LECTURER`): admin; creates semesters, lab groups, teams; assigns demonstrators;
  sees and exports everything; owns monitoring and its settings; reads lecturer notes. Does not edit
  students' form data.
- **Demonstrator**: read-only on teams in their own lab groups; comments on forms; monitoring views for
  those groups only. Cannot see PEER or lecturer notes.
- **Team Leader** = member holding TSPi role `TEAM_LEADER` in that team (not an app role): manages roster
  and TSPi roles, edits team-level forms (TASK, SCHEDULE plan, LOGTEST, WEEK, CCR, SUMS sizes, SUMQ plan).
- **Team Member**: edits only own individual forms (FORM-SI, LOGT, LOGD, LOGAI, PEER); reads team-level forms.
  Exception for member-owned team rows (`canEditOwnTeamRow`): own SCHEDULE row, own LOGTEST cases, own CCRs while
  SUBMITTED. The Team Leader edits any of these and decides CCRs (`canDecideChange`).
  Individual forms are readable by the owner, the lecturer and the group's demonstrator.
- **PEER** is visible only to its author and the lecturer. Students never see flags, lecturer notes,
  or others' PEER ratings.
- TSPi roles: each held by ≤2 members; only one role shared, and only in a 6-member team; the team must keep
  a Team Leader (lecturer can override). One active team per student per semester. Staff accounts cannot
  be team members.
- Registration only for `ALLOWED_EMAIL_DOMAINS` (exact domain match). Everyone registers as STUDENT;
  the lecturer assigns staff roles. First lecturer: `npm run create-lecturer`.
- Login and password reset are rate limited in Postgres (`RateLimit` table).

## Form rules (Stage 2)

- Form pages: `/t/[teamId]/forms/[slug]?member=<membershipId>` (staff pick the member; students see their own).
  `/forms` lists a student's forms. API: `/api/teams/[id]/{si,logt,logd,logai}` (+ `/[rowId]`), `?member=` on GET.
- LOGT: delta = stop − start − interruption (minutes), computed on the server; no future dates; phase must be
  one where time is logged (not AT/PL); sessions of one member may not overlap on the same day (back-to-back is fine);
  sessions past midnight are split into two entries.
- LOGD: number = next in the member's sequence (never reused); types 10–100 from the workbook; removal phase
  cannot be earlier than injection phase; Fix Ref. points to another of the member's defects.
- LOGAI: code AI-001… per student; reviewer is a current teammate (not self); only the reviewer can approve
  (`POST …/logai/[rowId]/review`); editing reviewed fields or changing reviewer withdraws approval.
- FORM-SI: sections A–K as in the information sheet; saving requires the declaration; `submittedAt` is the first
  submission (kept for lateness), later edits update `updatedAt`. Residence stored as option or `Other: …`.
- Components (team's assemblies/parts) are edited by the Team Leader on the Team page; deleted names can be re-added.
- Comments: lecturer and the group's demonstrator post; anyone who can read the form reads them. No comments on PEER.
- Deletes are soft (`deletedAt`); every list query filters `deletedAt: null`.

## Planning rules (Stage 3)

- TASK (Team Leader edits; team reads): plan hours entered, or left empty to use size ÷ rate. PV = plan hours /
  total plan hours; plan week = first week whose cumulative SCHEDULE hours cover the task's cumulative plan hours
  (tasks in `order`); EV = PV credited in the completion week (`completedOn`, no future dates). Actual hours =
  Σ LOGT delta linked to the task. Deleted tasks drop out of the plan.
- SCHEDULE: plan hours per member per week (`ScheduleWeek`); a member edits their own row, the Team Leader any row;
  team plan = sum. Actual hours = Σ LOGT of the team by week (up to the current week). Predicted EV/hours for
  future weeks = average per working week so far (from the first planned week; break weeks excluded and get 0).
  Warning when task plan hours exceed schedule hours.
- SUMTASK (read-only): per task deviation, CPI = plan/actual, plan vs done week, weeks late, status
  (done/overdue/in progress/not started); roll-ups by member, phase, component; LOGT hours not linked to a task.
- All of it is computed in `lib/server/forms/planning.ts` → `lib/tsp/earned-value.ts` + `lib/tsp/sumtask.ts`.
- Charts use the dataviz reference palette slots 1–2 (blue #2a78d6 planned, orange #eb6834 earned/actual,
  dashed orange predicted); validated with the dataviz validator. One y-axis per chart.

## Size and quality rules (Stage 4)

- SUMS (Team Leader edits sizes; team reads): per component a size measure and plan/actual Base, Deleted,
  Modified, Added, Reused, New Reuse are entered. N&C = M + A; Total = N + B − D − M + R (= B − D + A + R).
  Validation: deleted ≤ base, modified ≤ base − deleted, new reuse ≤ added. Components themselves are added on
  the Team page. Hierarchy via `parentId`; roll-ups add up leaf components only.
- SUMP / SUMQ (computed; `?component=<id>` for one assembly, default SYSTEM): plan time from TASK, actual time
  from LOGT, actual defects from LOGD, sizes from SUMS — all filtered to the assembly and its parts (SYSTEM
  includes records with no component). Planned defects: injected = plan rate × plan hours; removed = plan yield ×
  defects present; after ST: AT removes its yield, the rest is Product Life.
- SUMQ plan inputs (`QualityPlan`, SYSTEM only): per phase defects injected/hour and yield (0–1); Team Leader
  edits; with no rows the workbook guidelines (`DEFAULT_PLAN_YIELDS`, `DEFAULT_INJECTION_RATES`) apply.
- Ratios with a zero denominator are null and shown as "—" (the workbook shows 0). Goals from QualGuide are
  shown next to SUMQ values.
- Code: `lib/tsp/sizes.ts`, `lib/tsp/quality.ts`, loader `lib/server/forms/quality.ts`.

## Stage 5 rules: LOGTEST, WEEK, PEER, CCR, dashboards

- LOGTEST (team form): any member adds test cases authored by themselves (the leader may set another author);
  IDs TC-001… per team unless typed; IDs unique per team. Summary: counts by type/status, pass rate of executed.
- WEEK (Team Leader): one report per week from Week 5 to the current week, skipping break weeks; due Wednesday of
  the following week 16:00 MYT (before the lab). Figures as the workbook WEEK sheet (`lib/tsp/week.ts`), live until
  submitted, then frozen in `snapshot`; typed: tasks completed notes, risks and issues, next week's plan.
  `submittedAt` = first submission. Status: submitted / late / missing / open.
- PEER (individual, private to author + lecturer): per milestone with `peerRequired`; 10 rubric criteria 1–5
  (`lib/tsp/peer.ts`), self + every current member; submit requires all; first submission time kept; drafts allowed.
  New semesters set `peerRequired` = PEER in the milestone's required forms (default from M2). No comments on PEER.
- CCR: any member raises; requester edits/deletes while SUBMITTED; Team Leader edits any and sets status
  (approve/reject/implemented), which records decided by/at.
- Milestone completion (`lib/tsp/completion.ts`): complete / late / missing / pending per required form; log forms
  need an entry dated ≤ due (late if all such entries were typed after the due time); SUMP/SUMQ/SUMTASK follow their
  inputs; WEEK needs every report due by the milestone. Shown on `/t/[teamId]/milestones` and the team dashboard.
- Dashboards: `/dashboard` (member: hours this week, open tasks, forms to do, own contribution vs team average and
  share; no flags), `/t/[teamId]` (team: EV/hours charts, defects by phase, completion for the current milestone).
  `/team` and `/milestones` redirect a student to their team. Contribution measures in `lib/tsp/contribution.ts`.

## Stage 6 rules: monitoring, flags, GitHub, exports

- Pages: `/monitor` (class overview: one row per team, sort/filter by lab group, status, milestone; class-wide
  "Needs attention" = open flags), `/monitor/teams/[teamId]` (tiles, EV/hours charts, contribution table, flags,
  hours heatmap, weekly completion, milestone completion, GitHub, exports, notes), `/monitor/settings` (lecturer).
  Lecturer sees all teams of the active semester; a demonstrator only their groups' teams, without PEER data,
  PEER_MISMATCH flags or notes. Students get 404/redirect and never see flags anywhere.
- Team status: Behind if SPI (cum EV / cum PV) < `behindSpi` or no activity for > 2 × `inactiveDays`; At risk if
  SPI < `atRiskSpi`, no activity for > `inactiveDays`, a required form missing for a past milestone, or ≥ 2 open flags.
- Flags (`lib/monitoring/flags.ts`, thresholds in `MonitoringSettings.thresholds` per semester, defaults in settings.ts):
  LOW_SHARE (hours or EV < fraction × fair share over the last `windowWeeks`, and over the milestone period once
  it is longer than that window; windows with < `minTeamHours` team hours are not judged; key = milestone),
  INACTIVE (no LOGT for `weeks` consecutive working weeks, current week included; key `W{a}-W{b}`),
  HOURS_NO_OUTPUT (≥ `minHours` in the window but no completed task, test case or commit), BACKFILL (≥ `minEntries`
  log entries typed ≥ `lagDays` after their date within `sessionGapMinutes` of each other, ending ≤ `daysBeforeDeadline`
  before a milestone; key = milestone), PEER_MISMATCH (self − peers' average ≥ `selfAbovePeers`, or peers' average
  ≤ `lowPeerAverage`; lecturer only), MISSING_FORMS (WEEK late/missing on the leader `WEEK-W{n}`, PEER `PEER-{code}`).
  Every flag carries its evidence lines. Flags are prompts for review, never grades.
- Flag review (`FlagReview`, lecturer): Reviewed / Dismissed (reason required) / Reopened; every action is kept
  with the evidence at that moment; a flag's status is its latest review. Lecturer notes (`LecturerNote`) on a team
  or a member: lecturer only.
- GitHub: `Team.repoUrl` + FORM-SI GitHub usernames (case-insensitive). Commits since Week 1, PRs, reviews via REST with
  `GITHUB_TOKEN`; cached in `GitHubActivity` (unique `externalId`, so re-syncs add only new rows); errors stored in
  `GitHubSync.lastError` and the cache is kept. Refresh: lecturer button (one team / next batch) or the daily cron
  `GET /api/cron/daily` (`Authorization: Bearer CRON_SECRET`). Without `GITHUB_TOKEN` the GitHub columns are hidden.
  In this sandbox Node's fetch only reaches GitHub with credentials when started with `NODE_USE_ENV_PROXY=1
  NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` (not needed on Vercel).
- Exports (Excel and PDF, same document model): `/api/export/form?team=&form=&format=xlsx|pdf` and
  `/api/export/team?team=&format=` for staff who can view the team (PEER only for the lecturer);
  `/api/export/contribution?member=&milestone=&format=` (lecturer only: shares within the milestone period, GitHub,
  hours by week, PEER received vs self, forms, flags + review history, notes). PDFs use Helvetica, so text goes
  through `pdfSafe`; `pdfkit`'s font files are traced via `outputFileTracingIncludes` in next.config.ts.

## Stage 7 rules: production

- Deployment guide: `DEPLOY.md` (Vercel Hobby + Neon, region Singapore: `vercel.json` `regions: ["sin1"]`).
- Environments: production and preview each have their own Neon project (never a branch of production).
  `AppMeta.environment` marks each database; `npm run build` runs `scripts/deploy-target.ts check` before
  `prisma migrate deploy` (mismatch → build fails, nothing changed) and `mark` after it. Rules in `lib/deploy/target.ts`.
- CSP: `proxy.ts` sets a per-request nonce policy on every page (`lib/security/csp.ts`); the root layout calls
  `connection()` so every page renders dynamically and Next applies the nonce. Scripts: nonce + 'strict-dynamic'
  (no eval in production); styles: 'self' + 'unsafe-inline' (React style attributes). Other headers in next.config.ts.
- Errors: `app/global-error.tsx`, `app/(app)/error.tsx`, `app/(auth)/error.tsx` (generic text + digest),
  `app/not-found.tsx`, `app/(app)/not-found.tsx`.
- Cron (Hobby: once a day): `vercel.json` → `GET /api/cron/daily` 18:00 UTC: `cleanup()` then GitHub `syncBatch`
  (up to 45 s budget). Only production deployments run cron.
- Backups: Neon point-in-time restore + `npm run backup` (pg_dump custom format, verified with pg_restore --list).
  Dumps contain personal data: never commit (`/backups/`, `*.dump` git-ignored).
- `npm audit --omit=dev` is clean; exceljs's `uuid` is overridden to ^11.1.1 in `package.json` `overrides`.

## Decisions (defaults chosen at plan approval; change here if the lecturer decides otherwise)

1. SUMS plan/actual sizes (Base, Deleted, Modified, Added, Reused), SUMQ plan injection rates and plan
   yields, and SUMP %Reuse inputs are entered (as in the workbook) by the team; everything else on
   SUMS/SUMP/SUMQ/SUMTASK is computed read-only.
2. LOGT has an optional Task link (TASK actual hours = Σ LOGT delta for the task). LOGT and LOGD have a
   Component (= workbook Assembly).
3. TASK: one assigned member, plan hours, optional size/measure/rate; plan value is computed
   (plan hours / total plan hours).
4. SCHEDULE plan hours are entered per member per week (each member their own row, Team Leader any row);
   the team plan is their sum.
5. WEEK reports from Week 5 (the prompt's choice; the brief says "after the first milestone"), due before
   the following Wednesday lab (configurable later).
6. LOGAI IDs `AI-001…` numbered per student; reviewer is a teammate; `approved` flag.
7. PEER uses the 10 criteria of the Peer/Individual Evaluation rubric (1–5 each, 50 marks), self + each
   teammate, per milestone where `Milestone.peerRequired`. The anonymous Team Evaluation rubric is not
   included unless requested. (The dev seed also collects PEER at M1 so monitoring has data early.)
8. Required forms per milestone (editable on the semester page): M1 SI, TASK, SCHEDULE; M2 + LOGT, LOGD,
   LOGAI, WEEK, PEER; M3 + LOGTEST, SUMS, SUMP, SUMQ, SUMTASK; M4 same as M3. CCR always optional.
9. CCR fields: number, date, requester, component, description, reason, impact, priority, status
   (submitted/approved/rejected/implemented), decided by/at.
10. All 24 workbook phases are available; the lecturer can hide phases per semester (`Semester.hiddenPhases`).
11. The lecturer (or a team leader) adds students to teams by e-mail after they register.
12. Calendar: Week 1 = Mon 21 Sep 2026, break = Week 8, M1 Wk5, M2 Wk9, M3 Wk13 (Wed 23:59 MYT),
    M4 Wk15 (Sat 2 Jan 2027 22:00 MYT).
13. Preview deployments use a separate Neon database with test data only (never a branch of production).
14. Git: work is pushed to the session's designated branch (`claude/modest-cori-685ap0`) until told to use `main`.

## Stages

1. ✅ Setup, schema, auth and roles  2. ✅ FORM-SI, LOGT, LOGD, LOGAI  3. ✅ TASK, SCHEDULE, EV, SUMTASK
4. ✅ SUMS, SUMP, SUMQ  5. ✅ LOGTEST, WEEK, PEER, CCR, dashboards, milestone view
6. ✅ Monitoring, flags, GitHub, exports  7. ✅ Production hardening, Vercel/Neon, cron, backups, DEPLOY.md
