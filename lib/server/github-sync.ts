import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { githubEnabled } from "@/lib/env";
import { GitHubError, getAll } from "@/lib/github/client";
import { loginMap, parseCommits, parsePulls, parseRepoUrl, parseReviews, pullSchema, type ActivityRow } from "@/lib/github/parse";

/** Reviews are fetched per pull request; cap the requests per team per run (serverless time limits). */
const MAX_PRS_FOR_REVIEWS = 30;

export interface SyncResult {
  teamId: string;
  ok: boolean;
  added: number;
  error?: string;
}

/** Pulls commits, pull requests and reviews for one team's repository into GitHubActivity. */
export async function syncTeam(teamId: string): Promise<SyncResult> {
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId }, include: { labGroup: { include: { semester: true } }, githubSync: true } });
  const repo = parseRepoUrl(team.repoUrl);
  const record = async (error: string | null) =>
    db.gitHubSync.upsert({
      where: { teamId },
      create: { teamId, lastSyncedAt: error ? null : new Date(), lastError: error },
      update: { ...(error ? {} : { lastSyncedAt: new Date() }), lastError: error },
    });
  if (!repo) {
    await record("No valid GitHub repository URL for this team");
    return { teamId, ok: false, added: 0, error: "No repository URL" };
  }
  try {
    const since = team.labGroup.semester.week1Monday.toISOString();
    const base = `/repos/${repo.owner}/${repo.repo}`;
    const rows: ActivityRow[] = [];
    rows.push(...parseCommits(repo, await getAll(`${base}/commits?since=${since}&per_page=100`, 5)));
    const pullsRaw = await getAll(`${base}/pulls?state=all&sort=updated&direction=desc&per_page=100`, 3);
    rows.push(...parsePulls(repo, pullsRaw));
    const lastSynced = team.githubSync?.lastSyncedAt;
    const pulls = pullsRaw.flatMap((p) => {
      const r = pullSchema.extend({ updated_at: z.string() }).safeParse(p);
      return r.success ? [r.data] : [];
    });
    for (const p of pulls.filter((x) => !lastSynced || new Date(x.updated_at) >= lastSynced).slice(0, MAX_PRS_FOR_REVIEWS)) {
      rows.push(...parseReviews(repo, p.number, await getAll(`${base}/pulls/${p.number}/reviews?per_page=100`, 1)));
    }

    const members = await db.membership.findMany({ where: { teamId }, include: { studentInfo: { select: { githubUsername: true } } } });
    const logins = loginMap(members.map((m) => ({ membershipId: m.id, githubUsername: m.studentInfo?.githubUsername ?? null })));
    const created = await db.gitHubActivity.createMany({
      data: rows.map((r) => ({ teamId, membershipId: logins.get(r.login.toLowerCase()) ?? null, ...r })),
      skipDuplicates: true,
    });
    // Usernames may have been added or corrected on FORM-SI since earlier syncs.
    for (const [login, membershipId] of logins) {
      await db.gitHubActivity.updateMany({ where: { teamId, login: { equals: login, mode: "insensitive" } }, data: { membershipId } });
    }
    await record(null);
    return { teamId, ok: true, added: created.count };
  } catch (err) {
    const message = err instanceof GitHubError ? err.message : "GitHub request failed";
    if (!(err instanceof GitHubError)) console.error("github sync", teamId, err);
    await record(message);
    return { teamId, ok: false, added: 0, error: message };
  }
}

/**
 * Syncs the teams synced longest ago, a few at a time, within a time budget
 * (Vercel function limits; the daily cron and the lecturer's "refresh" both use this).
 */
export async function syncBatch(opts: { semesterActiveOnly?: boolean; maxTeams?: number; budgetMs?: number } = {}): Promise<SyncResult[]> {
  if (!githubEnabled()) return [];
  const started = Date.now();
  const teams = await db.team.findMany({
    where: { repoUrl: { not: null }, ...(opts.semesterActiveOnly === false ? {} : { labGroup: { semester: { isActive: true } } }) },
    include: { githubSync: true },
  });
  teams.sort((a, b) => (a.githubSync?.lastSyncedAt?.getTime() ?? 0) - (b.githubSync?.lastSyncedAt?.getTime() ?? 0));
  const results: SyncResult[] = [];
  for (const t of teams.slice(0, opts.maxTeams ?? 5)) {
    if (Date.now() - started > (opts.budgetMs ?? 40_000)) break;
    results.push(await syncTeam(t.id));
  }
  return results;
}
