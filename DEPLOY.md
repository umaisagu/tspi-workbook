# Deploying TSPi Workbook (Vercel + Neon)

This guide puts the app on **Vercel** (Hobby plan) with **Neon** Postgres. It takes about 30 minutes the
first time. You need a GitHub account with this repository, a Vercel account and a Neon account.

Plan limits change; check the current Vercel and Neon pricing pages before relying on a specific limit.
Vercel's Hobby plan is meant for personal, non-commercial use; check that a course deployment fits its terms.

## 1. Environments

| Environment | Vercel deployments | Database | Data |
| --- | --- | --- | --- |
| Production | the production branch (e.g. `main`) | Neon project **tspi-production** | real students |
| Preview | every other branch and pull request | Neon project **tspi-preview** (a separate project, *not* a branch of production) | test data only |
| Development | your computer | local Postgres | `npm run db:seed` |

Preview deployments must never touch production data. Two things enforce it:

1. Each Vercel environment has its own `DATABASE_URL` / `DIRECT_URL` (step 4).
2. Every database records which environment it belongs to (table `AppMeta`, written on its first build).
   `npm run build` runs `scripts/deploy-target.ts` **before** migrating: a preview build pointed at the production
   database (or the reverse) stops with "This database is marked "production", but this is a preview build" and
   changes nothing. The seed also refuses a database marked production.

## 2. Neon: two projects

For each of **tspi-production** and **tspi-preview**:

1. Neon console → **New project**. Postgres version: the default. Region: **AWS Asia Pacific (Singapore)**
   (`ap-southeast-1`), close to Kuching and to the Vercel region used here (`sin1`).
2. Open **Connect**, choose the database (`neondb`) and copy two connection strings:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`, used by the app.
   - **Direct** (connection pooling switched off) → `DIRECT_URL`, used by migrations, the build guard and backups.
   Both end in `?sslmode=require`.

Keep the production strings in a password manager. Do not paste them into chats, issues or commits.

## 3. Secrets to generate

Generate each value separately for production and preview:

```bash
openssl rand -base64 32   # AUTH_SECRET (signs sessions; changing it signs everyone out)
openssl rand -hex 32      # CRON_SECRET (Vercel Cron sends it to /api/cron/daily)
```

Optional, for the GitHub columns: a **GITHUB_TOKEN**, a fine-grained personal access token with read-only access
(Metadata, Contents, Pull requests). Public team repositories need no extra permissions. For private ones, the token's
owner must have read access (students add that account as a collaborator).

E-mail (password reset) needs an SMTP account: the university mail server, or a transactional provider.
Preview deployments also require SMTP; use a test inbox service there so students never get preview e-mails.

## 4. Vercel project

1. Vercel → **Add New… → Project** → import `umaisagu/tspi-workbook`. Framework: Next.js (detected).
   Keep the defaults: install `npm ci`, build `npm run build`. Node.js 22 comes from `package.json` `engines`.
2. **Settings → Environment Variables**. Add each variable **twice**: one value scoped to *Production*, one to
   *Preview*. Never tick both environments for the database URLs or secrets.

   | Variable | Production | Preview |
   | --- | --- | --- |
   | `DATABASE_URL` | tspi-production pooled | tspi-preview pooled |
   | `DIRECT_URL` | tspi-production direct | tspi-preview direct |
   | `AUTH_SECRET` | its own value | its own value |
   | `APP_URL` | `https://<your production domain>` | your preview branch URL |
   | `ALLOWED_EMAIL_DOMAINS` | `siswa.unimas.my,unimas.my` | same |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_SECURE` | real SMTP | test inbox |
   | `CRON_SECRET` | its own value | its own value |
   | `GITHUB_TOKEN` | optional | optional |

   A missing or invalid variable stops the server at start-up with a message naming it (see `lib/env.ts`).
   On Vercel, `DIRECT_URL`, SMTP and `CRON_SECRET` are required.
3. **Settings → Git**: production branch `main` (or the branch you deploy from).
4. Deploy. The build log shows:
   ```
   Deploy target OK: production build, database not marked yet.
   … prisma migrate deploy …
   Database marked as "production".
   ```
   Later builds show `database marked "production"`.

`vercel.json` pins the functions to `sin1` (Singapore) and registers the daily cron job.

## 5. First Lecturer account (once)

There is no default account or password. From your computer, against the **production direct** connection string:

```bash
DATABASE_URL="<tspi-production DIRECT connection string>" npm run create-lecturer
```

It asks for name, e-mail and password. Then sign in at `APP_URL` and:

1. **Admin → Semesters**: create the semester (Week 1 Monday, break weeks, milestones and required forms), mark it active.
2. **Admin → Lab groups**: create groups and assign demonstrators. Demonstrators register first, then the lecturer
   gives them the Demonstrator role under **Users**.
3. Students register with their university e-mail. Create teams and add students by e-mail; set each team's GitHub
   repository URL.
4. **Monitor → Flag settings**: adjust thresholds if needed.

For a preview database with sample data, from your computer:
`SEED_ALLOW_REMOTE=yes DATABASE_URL="<tspi-preview DIRECT>" npm run db:seed` (refused on a production database).

## 6. Daily job (cron)

`vercel.json` schedules `GET /api/cron/daily` at 18:00 UTC (02:00 MYT). Vercel runs cron jobs only on production
deployments, and on Hobby once a day at some point within the scheduled hour. The job:

- deletes rate-limit rows older than a day and password-reset tokens expired or used more than 7 days ago;
- refreshes GitHub data for as many teams as fit in about 45 seconds, least recently synced first. The lecturer can
  also refresh from **Monitor**.

Check it in Vercel → **Settings → Cron Jobs** (Run now) or **Logs** (filter `/api/cron/daily`). Without the correct
`Authorization: Bearer $CRON_SECRET` header the route answers 401.

## 7. Backups and restore

**Built in:** Neon keeps a history of the database and can restore it to an earlier point in time
(Neon console → your project → **Backup & Restore**). The length of the history depends on your Neon plan; check it.

**Off-site copy:** at least before each milestone and at the end of the semester, from your computer
(needs PostgreSQL client tools, `pg_dump`/`pg_restore`, at least as new as the Neon server version):

```bash
BACKUP_DATABASE_URL="<tspi-production DIRECT connection string>" npm run backup
```

This writes `backups/tspi-<host>-<date>.dump` (compressed) and checks that it can be read back. The file contains
students' personal data: keep it on encrypted storage, never in this repository (`/backups/` is git-ignored) or a
shared drive.

**Restore** into a new, empty database (a new Neon project or branch), never over a live one:

```bash
pg_restore --no-owner --no-acl -d "<new database DIRECT connection string>" backups/tspi-….dump
```

The restored database keeps its `AppMeta` environment marker, so a production backup restored for testing is still
refused by preview builds. To use the restored database for testing, delete that row first:
`DELETE FROM "AppMeta" WHERE key = 'environment';`.
To replace production after an incident, point the production `DATABASE_URL`/`DIRECT_URL` at the restored database
and redeploy.

Excel/PDF exports (**Monitor → team → Exports**) are a readable record of each team's forms, not a backup.

## 8. Security checklist

- Secrets only in Vercel environment variables. `.env` is git-ignored; `.env.example` lists every variable.
- HTTPS everywhere. Session cookies are `Secure`/`HttpOnly` on HTTPS (Auth.js `__Secure-` cookies). Sessions last
  7 days and are revoked by a password reset, a role change or deactivation.
- Security headers on every response: Content-Security-Policy with a per-request nonce (`proxy.ts`,
  `lib/security/csp.ts`), HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`.
- Users never see stack traces: API errors are generic JSON (`route()`), pages show a generic error with a reference
  code that matches the server log.
- Login and password-reset requests are rate limited.
- Never run `npm run db:migrate` (`prisma migrate dev`) or `npm run db:seed` against production. The build applies
  migrations with `prisma migrate deploy`.
- `npm audit --omit=dev` should report no known vulnerabilities.

## 9. Routine tasks

| When | What |
| --- | --- |
| Before each milestone | `npm run backup`; check **Monitor** "Needs attention" |
| New semester | Admin → create semester, mark it active; teams and lab groups belong to it |
| Rotate `AUTH_SECRET` | Change it in Vercel (Production) and redeploy: everyone signs in again |
| Rotate `CRON_SECRET` / `GITHUB_TOKEN` | Change it in Vercel and redeploy |
| Lecturer leaves | Create the new lecturer under **Users** (or `npm run create-lecturer`), then deactivate the old account |

## 10. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Build: `Deploy target check failed … marked "production", but this is a preview build` | The Preview environment points at the production database. Fix `DATABASE_URL`/`DIRECT_URL` for Preview. |
| Server error: `Invalid environment configuration` | A variable is missing or invalid; the message names it. Add it in Vercel and redeploy. |
| Build: `P1001` / cannot reach database | Wrong `DIRECT_URL`, or the Neon project is suspended. Check the Neon console. |
| Password-reset e-mails don't arrive | SMTP settings; the Vercel function log shows the SMTP error. |
| GitHub columns missing | `GITHUB_TOKEN` is not set (by design). |
| GitHub "last error" on a team | Repository URL wrong or private without access; fix it on the team page, then **Refresh now**. |
| First request after a quiet period is slow | Neon scales to zero when idle; the first query wakes it (a few seconds). |
