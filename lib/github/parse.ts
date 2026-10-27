/**
 * Pure parsing of GitHub REST API responses into activity rows (commits, pull requests, reviews).
 * Responses are external data: they are validated with Zod and anything unexpected is skipped.
 */
import { z } from "zod";

export interface RepoRef {
  owner: string;
  repo: string;
}

/** "https://github.com/owner/repo(.git)(/)" → { owner, repo } */
export function parseRepoUrl(url: string | null | undefined): RepoRef | null {
  if (!url) return null;
  const m = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/.exec(url.trim());
  return m ? { owner: m[1]!, repo: m[2]! } : null;
}

/** URL of the next page from a Link header, or null. */
export function nextPageUrl(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(",")) {
    const m = /<([^>]+)>;\s*rel="next"/.exec(part);
    if (m) return m[1]!;
  }
  return null;
}

const user = z.object({ login: z.string() }).nullable().optional();

export const commitSchema = z.object({
  sha: z.string(),
  html_url: z.string(),
  author: user,
  commit: z.object({ message: z.string(), author: z.object({ date: z.string() }).nullable().optional() }),
});
export const pullSchema = z.object({
  number: z.number(),
  html_url: z.string(),
  title: z.string(),
  created_at: z.string(),
  user,
});
export const reviewSchema = z.object({
  id: z.number(),
  html_url: z.string(),
  submitted_at: z.string().nullable().optional(),
  state: z.string(),
  user,
});

export interface ActivityRow {
  kind: "COMMIT" | "PULL_REQUEST" | "REVIEW";
  externalId: string;
  login: string;
  occurredAt: Date;
  url: string;
  title: string | null;
}

function parseList<T>(schema: z.ZodType<T>, data: unknown): T[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const r = schema.safeParse(item);
    return r.success ? [r.data] : [];
  });
}

export function parseCommits(repo: RepoRef, data: unknown): ActivityRow[] {
  return parseList(commitSchema, data).flatMap((c) =>
    c.author?.login && c.commit.author?.date
      ? [
          {
            kind: "COMMIT" as const,
            externalId: `commit:${repo.owner}/${repo.repo}:${c.sha}`,
            login: c.author.login,
            occurredAt: new Date(c.commit.author.date),
            url: c.html_url,
            title: c.commit.message.split("\n")[0]!.slice(0, 200),
          },
        ]
      : [],
  );
}

export function parsePulls(repo: RepoRef, data: unknown): ActivityRow[] {
  return parseList(pullSchema, data).flatMap((p) =>
    p.user?.login
      ? [
          {
            kind: "PULL_REQUEST" as const,
            externalId: `pr:${repo.owner}/${repo.repo}:${p.number}`,
            login: p.user.login,
            occurredAt: new Date(p.created_at),
            url: p.html_url,
            title: p.title.slice(0, 200),
          },
        ]
      : [],
  );
}

/** Reviews of one pull request; pending (unsubmitted) reviews are skipped. */
export function parseReviews(repo: RepoRef, prNumber: number, data: unknown): ActivityRow[] {
  return parseList(reviewSchema, data).flatMap((r) =>
    r.user?.login && r.submitted_at && r.state !== "PENDING"
      ? [
          {
            kind: "REVIEW" as const,
            externalId: `review:${repo.owner}/${repo.repo}:${r.id}`,
            login: r.user.login,
            occurredAt: new Date(r.submitted_at),
            url: r.html_url,
            title: `Review of #${prNumber} (${r.state.toLowerCase().replace("_", " ")})`,
          },
        ]
      : [],
  );
}

/** login (any case) → membership id, from FORM-SI GitHub usernames. */
export function loginMap(members: readonly { membershipId: string; githubUsername: string | null }[]): Map<string, string> {
  return new Map(members.filter((m) => m.githubUsername).map((m) => [m.githubUsername!.toLowerCase(), m.membershipId]));
}

/** Counts per member: commits, PRs opened, reviews of others' PRs. */
export function githubCounts(
  rows: readonly { membershipId: string | null; kind: ActivityRow["kind"] }[],
): Map<string, { commits: number; pullRequests: number; reviews: number }> {
  const out = new Map<string, { commits: number; pullRequests: number; reviews: number }>();
  for (const r of rows) {
    if (!r.membershipId) continue;
    const c = out.get(r.membershipId) ?? { commits: 0, pullRequests: 0, reviews: 0 };
    if (r.kind === "COMMIT") c.commits++;
    else if (r.kind === "PULL_REQUEST") c.pullRequests++;
    else c.reviews++;
    out.set(r.membershipId, c);
  }
  return out;
}
