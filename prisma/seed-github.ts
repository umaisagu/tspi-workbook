/**
 * Dev seed: cached GitHub activity (as the daily sync would store it), so the GitHub columns and the
 * "hours without output" flag have data without calling the API. Logins follow the FORM-SI GitHub usernames.
 * Profiles: high/normal commit every week, low rarely, inactive stops with LOGT, backfill commits in bursts.
 * Members without FORM-SI appear under an unmatched login.
 */
import type { PrismaClient } from "../generated/prisma/client";
import { weekStart } from "../lib/tsp/calendar";
import { rng, type SeedMember } from "./seed-logs";

const COMMITS_PER_WEEK = { high: 6, normal: 3.5, low: 0.6, inactive: 3, backfill: 2 } as const;

export async function seedGithub(
  db: PrismaClient,
  opts: { teamId: string; repo: string; members: SeedMember[]; week1: Date; currentWeek: number; breakWeeks: readonly number[]; seed: number },
) {
  const r = rng(opts.seed);
  const now = Date.now();
  const rows: { teamId: string; membershipId: string | null; login: string; kind: "COMMIT" | "PULL_REQUEST" | "REVIEW"; externalId: string; occurredAt: Date; url: string; title: string }[] = [];
  let pr = 1;
  const reviewers = opts.members.filter((m) => m.profile === "normal" || m.profile === "high");
  for (const m of opts.members) {
    const login = m.siSubmitted === "missing" ? `user-${m.matric}` : m.name.split(" ")[0]!.toLowerCase() + m.matric.slice(-2);
    const membershipId = m.siSubmitted === "missing" ? null : m.membershipId;
    for (let week = 3; week <= opts.currentWeek; week++) {
      if (opts.breakWeeks.includes(week)) continue;
      if (m.profile === "inactive" && week > opts.currentWeek - 2) continue;
      if (m.profile === "backfill" && week % 2 === 1) continue;
      const expected = COMMITS_PER_WEEK[m.profile] * (m.profile === "backfill" ? 2 : 1);
      const n = Math.floor(expected * (0.6 + r() * 0.8) + r());
      for (let i = 0; i < n; i++) {
        const at = new Date(weekStart(week, opts.week1).getTime() + Math.floor(r() * 7 * 86400_000) + 2 * 3600_000);
        if (at.getTime() > now) continue;
        const sha = Math.floor(r() * 0xffffffff).toString(16).padStart(8, "0") + Math.floor(r() * 0xffffffff).toString(16).padStart(8, "0");
        rows.push({ teamId: opts.teamId, membershipId, login, kind: "COMMIT", externalId: `${opts.repo}#commit:${sha}${rows.length}`, occurredAt: at, url: `https://github.com/${opts.repo}/commit/${sha}`, title: `Update ${["auth flow", "item list", "tests", "UI", "README", "API client"][Math.floor(r() * 6)]}` });
      }
      // A pull request every other week for regular contributors, each reviewed by a teammate.
      if ((m.profile === "normal" || m.profile === "high") && (week + Number(m.matric.slice(-1))) % 2 === 0) {
        const at = new Date(weekStart(week, opts.week1).getTime() + 4 * 86400_000 + 6 * 3600_000);
        if (at.getTime() > now) continue;
        const number = pr++;
        rows.push({ teamId: opts.teamId, membershipId, login, kind: "PULL_REQUEST", externalId: `${opts.repo}#pr:${number}`, occurredAt: at, url: `https://github.com/${opts.repo}/pull/${number}`, title: `Week ${week} work by ${login}` });
        const reviewer = reviewers.filter((x) => x.membershipId !== m.membershipId)[Math.floor(r() * (reviewers.length - 1))];
        if (reviewer) {
          const rLogin = reviewer.name.split(" ")[0]!.toLowerCase() + reviewer.matric.slice(-2);
          rows.push({ teamId: opts.teamId, membershipId: reviewer.siSubmitted === "missing" ? null : reviewer.membershipId, login: rLogin, kind: "REVIEW", externalId: `${opts.repo}#review:${number}`, occurredAt: new Date(Math.min(at.getTime() + 20 * 3600_000, now)), url: `https://github.com/${opts.repo}/pull/${number}`, title: `Review of #${number}` });
        }
      }
    }
  }
  await db.gitHubActivity.createMany({ data: rows });
  await db.gitHubSync.create({ data: { teamId: opts.teamId, lastSyncedAt: new Date(now - 3 * 3600_000) } });
  return rows.length;
}
