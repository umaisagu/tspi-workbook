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
| Unit tests | `npm test` (Vitest; `lib/**/*.test.ts`) |
| New migration (dev only) | `npm run db:migrate -- --name <name>` |
| Apply migrations | `npm run db:deploy` |
| Seed (dev only, wipes DB) | `npm run db:seed` — all seeded accounts use password `tspi-dev-2026`; log data is generated up to "today" (prisma/seed-logs.ts) |
| Production build | `npm run build` = `prisma generate && prisma migrate deploy && next build` |
| First lecturer (production, once) | `npm run create-lecturer` |

Never run `migrate dev` or the seed against production. The seed refuses non-local hosts unless
`SEED_ALLOW_REMOTE=yes` (preview database only).

## Stack and versions

- Next.js 16 (App Router, Turbopack). **Cache Components is off** (`cacheComponents: false`): every page is
  per-user. `middleware` is now `proxy.ts` (Node runtime). `params`/`searchParams` are Promises;
  use the generated `PageProps<"/route">`, `LayoutProps`, `RouteContext<"/api/...">` types.
  Next 16 docs are in `node_modules/next/dist/docs/` — read them before using unfamiliar APIs.
- React 19, Tailwind CSS 4, TypeScript strict (+ `noUncheckedIndexedAccess`), ESLint bans `any`.
- Prisma 7: generator `prisma-client` → `generated/prisma` (git-ignored). `prisma.config.ts` gives the CLI
  `DIRECT_URL`; the app uses `DATABASE_URL` (pooled) through `@prisma/adapter-pg` in `lib/db.ts`.
- Auth.js v5 (`next-auth@beta`), Credentials provider, JWT sessions. Every request re-loads the user
  (`lib/server/viewer.ts`): deactivated users and sessions older than the user's `sessionVersion`
  (bumped on password reset / role change) are rejected.
- Zod 4 schemas in `lib/schemas` are shared by client forms and API routes.
- Vitest 4. npm 10 hits a peer-resolution bug when *adding* vitest; use `--legacy-peer-deps` for that
  one install. `npm ci` works normally.

## Folder conventions

```
app/(auth)/…            login, register, forgot-password, reset-password
app/(app)/…             signed-in pages (layout loads the user and nav)
app/api/…               route handlers; every handler wrapped in route() from lib/server/http.ts
components/ui|roster|admin|forms   forms/log-table.tsx = generic editable table (add/edit/delete, Zod inline validation, week/phase filters)
lib/forms.ts            form slugs/titles; AVAILABLE_FORMS lists the forms with pages
lib/server/forms/       access.ts (individualFormAccess / requireTeamForm), refs.ts (cross-record checks), loaders
lib/tsp/                pure TSPi formulas + tests (calendar, phases, roles, milestones, time, defects, ai-log, student-info)
lib/monitoring/         pure contribution-flag logic + tests (Stage 6)
lib/auth/               Auth.js config, permissions.ts (pure, tested), email/rate-limit helpers
lib/schemas/            Zod schemas (shared)
lib/server/             server-only data access, guards, audit helpers
prisma/                 schema, migrations, seed.ts
scripts/                create-lecturer.ts, extract-workbook.py, db-client.ts
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

## Decisions (defaults chosen at plan approval; change here if the lecturer decides otherwise)

1. SUMS plan/actual sizes (Base, Deleted, Modified, Added, Reused), SUMQ plan injection rates and plan
   yields, and SUMP %Reuse inputs are entered (as in the workbook) by the team; everything else on
   SUMS/SUMP/SUMQ/SUMTASK is computed read-only.
2. LOGT has an optional Task link (TASK actual hours = Σ LOGT delta for the task). LOGT and LOGD have a
   Component (= workbook Assembly).
3. TASK: one assigned member, plan hours, optional size/measure/rate; plan value is computed
   (plan hours / total plan hours).
4. SCHEDULE plan hours are entered per member per week; the team plan is their sum.
5. WEEK reports from Week 5 (the prompt's choice; the brief says "after the first milestone"), due before
   the following Wednesday lab (configurable later).
6. LOGAI IDs `AI-001…` numbered per student; reviewer is a teammate; `approved` flag.
7. PEER uses the 10 criteria of the Peer/Individual Evaluation rubric (1–5 each, 50 marks), self + each
   teammate, per milestone where `Milestone.peerRequired`. The anonymous Team Evaluation rubric is not
   included unless requested.
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

1. ✅ Setup, schema, auth and roles  2. ✅ FORM-SI, LOGT, LOGD, LOGAI  3. TASK, SCHEDULE, EV, SUMTASK
4. SUMS, SUMP, SUMQ  5. LOGTEST, WEEK, PEER, CCR, dashboards, milestone view
6. Monitoring, flags, GitHub, exports  7. Production hardening, Vercel/Neon, cron, backups, DEPLOY.md
