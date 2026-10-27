import "server-only";
import { getEnv } from "@/lib/env";
import { nextPageUrl } from "./parse";

export class GitHubError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const API = "https://api.github.com";

/** GET a GitHub REST endpoint and follow Link pagination up to `maxPages` pages. */
export async function getAll(path: string, maxPages = 3): Promise<unknown[]> {
  const token = getEnv().GITHUB_TOKEN;
  if (!token) throw new GitHubError(0, "GITHUB_TOKEN is not set");
  const out: unknown[] = [];
  let url: string | null = path.startsWith("http") ? path : `${API}${path}`;
  for (let page = 0; url && page < maxPages; page++) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "tspi-workbook" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (res.status === 404) throw new GitHubError(404, "Repository not found, or the token has no access to it");
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get("x-ratelimit-reset");
      throw new GitHubError(res.status, `GitHub rate limit or permission error${reset ? ` (resets ${new Date(Number(reset) * 1000).toISOString()})` : ""}`);
    }
    if (res.status === 409) return out; // empty repository
    if (!res.ok) throw new GitHubError(res.status, `GitHub API error ${res.status}`);
    const data: unknown = await res.json();
    if (Array.isArray(data)) out.push(...data);
    url = nextPageUrl(res.headers.get("link"));
  }
  return out;
}
