# TSPi Workbook

A web replacement for the TSPi Excel workbook, built for **TMA3084 Software Engineering Lab (UNIMAS)**.
Student teams fill in and submit their TSPi forms online; the lecturer and lab demonstrators track team
progress and individual contribution.

Stack: Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL + Prisma 7 · Auth.js v5 · Zod · Vitest.

## Status

- [x] Stage 1 — project setup, database schema, authentication and roles
- [x] Stage 2 — FORM-SI, LOGT, LOGD, LOGAI
- [x] Stage 3 — TASK, SCHEDULE, earned value, SUMTASK
- [x] Stage 4 — SUMS, SUMP, SUMQ
- [x] Stage 5 — LOGTEST, WEEK, PEER, CCR, dashboards, milestone view
- [x] Stage 6 — lecturer monitoring, contribution flags, GitHub, exports
- [x] Stage 7 — production hardening and deployment ([DEPLOY.md](DEPLOY.md))

## Local setup

Requirements: Node.js 22+, PostgreSQL 16.

```bash
# 1. Database (Claude Code on the web: `service postgresql start`)
createuser -P tspi            # password: tspi (dev only)
createdb -O tspi tspi_dev

# 2. Environment
cp .env.example .env          # then set AUTH_SECRET: openssl rand -base64 32

# 3. Install, migrate, seed
npm ci
npm run db:deploy             # apply migrations
npm run db:seed               # sample data (development only — wipes the database)

# 4. Run
npm run dev                   # http://localhost:3000
```

Seeded accounts (password `tspi-dev-2026`): `lecturer@unimas.my`, demonstrators `demo1@siswa.unimas.my`
and `demo2@siswa.unimas.my`, team leaders `84001@siswa.unimas.my` and `84011@siswa.unimas.my`,
members `84002`–`84006` and `84012`–`84015` `@siswa.unimas.my`.

The seed generates FORM-SI, LOGT, LOGD, LOGAI, TASK, SCHEDULE, SUMS sizes, LOGTEST, WEEK, PEER (at M1, seed only)
and CCR data up to the current semester week. Two members are
deliberately unusual: `84005` (Elvis) stops logging two weeks before today, and `84012` (Haziq) enters most of his
LOGT in one sitting just before the M1 deadline and submits PEER late. `84006` (Farhan) rates himself far above his
teammates' ratings. `84015` has not submitted FORM-SI.

Without SMTP settings, password-reset links are printed in the dev server's log.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run typecheck` | Generate Prisma client and route types, then `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) for formulas, permissions and flags |
| `npm run db:migrate -- --name <name>` | Create and apply a migration (development only) |
| `npm run db:deploy` | Apply pending migrations |
| `npm run db:seed` | Load development sample data (refuses production / remote hosts) |
| `npm run build` | `prisma generate && prisma migrate deploy && next build` (used by Vercel) |
| `npm run create-lecturer` | One-time: create the first Lecturer account (prompts for details) |
| `npm run backup` | Off-site backup with `pg_dump` to `./backups` (see DEPLOY.md) |

## Lecturer monitoring

- **/monitor**: class overview: one row per team with status (On track / At risk / Behind), EV vs PV, hours,
  milestone form completion and days since last activity. Below it, a "Needs attention" list of open flags.
- **/monitor/teams/&lt;team&gt;**: charts, contribution shares per member, flags with evidence (review, dismiss with
  a reason, reopen; history kept), a weekly hours heatmap, weekly form completion, GitHub activity, Excel/PDF
  exports and private notes.
- **/monitor/settings**: every flag and status threshold for the active semester.
- **GitHub**: set each team's repository URL on the team page; students enter their GitHub username in FORM-SI.
  With `GITHUB_TOKEN` set, activity is refreshed daily by `/api/cron/daily` (send `Authorization: Bearer $CRON_SECRET`)
  or on demand from the monitoring pages. Without a token the GitHub columns are hidden.

Flags are prompts for review, not grades. Students never see flags, lecturer notes or other members' PEER ratings.

## Deployment

Vercel (Hobby) + Neon Postgres, with separate production and preview databases: see **[DEPLOY.md](DEPLOY.md)**
for environment variables, the first Lecturer account, the daily cron job, backups and restore.

## Project layout

See [CLAUDE.md](CLAUDE.md) for conventions, role rules and design decisions, and
[docs/workbook-formulas.md](docs/workbook-formulas.md) for the TSPi formulas taken from the original workbook.
