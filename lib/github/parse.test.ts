import { describe, expect, it } from "vitest";
import { githubCounts, loginMap, nextPageUrl, parseCommits, parsePulls, parseRepoUrl, parseReviews } from "./parse";

const repo = { owner: "tma3084-2026", repo: "kenyalang" };

describe("parseRepoUrl", () => {
  it("accepts GitHub repository URLs", () => {
    expect(parseRepoUrl("https://github.com/tma3084-2026/kenyalang")).toEqual(repo);
    expect(parseRepoUrl("https://github.com/tma3084-2026/kenyalang.git")).toEqual(repo);
    expect(parseRepoUrl("https://github.com/a/b.c-d/")).toEqual({ owner: "a", repo: "b.c-d" });
  });
  it("rejects other URLs", () => {
    expect(parseRepoUrl("https://gitlab.com/a/b")).toBeNull();
    expect(parseRepoUrl("https://github.com/a")).toBeNull();
    expect(parseRepoUrl(null)).toBeNull();
  });
});

describe("nextPageUrl", () => {
  it("reads rel=next from the Link header", () => {
    const link = '<https://api.github.com/repositories/1/commits?page=2>; rel="next", <https://api.github.com/repositories/1/commits?page=5>; rel="last"';
    expect(nextPageUrl(link)).toBe("https://api.github.com/repositories/1/commits?page=2");
    expect(nextPageUrl('<https://x?page=1>; rel="prev"')).toBeNull();
    expect(nextPageUrl(null)).toBeNull();
  });
});

describe("parsing API responses", () => {
  it("commits: login, date and first line of the message; skips commits without a GitHub user", () => {
    const rows = parseCommits(repo, [
      { sha: "abc", html_url: "https://github.com/x/c/abc", author: { login: "aina01" }, commit: { message: "FR-01 login screen\n\ndetails", author: { date: "2026-10-20T10:00:00Z" } } },
      { sha: "def", html_url: "u", author: null, commit: { message: "unknown author", author: { date: "2026-10-20T10:00:00Z" } } },
      { nonsense: true },
    ]);
    expect(rows).toEqual([
      { kind: "COMMIT", externalId: "commit:tma3084-2026/kenyalang:abc", login: "aina01", occurredAt: new Date("2026-10-20T10:00:00Z"), url: "https://github.com/x/c/abc", title: "FR-01 login screen" },
    ]);
  });
  it("pull requests", () => {
    const rows = parsePulls(repo, [{ number: 7, html_url: "u", title: "Add listing", created_at: "2026-10-21T01:00:00Z", user: { login: "ben02" } }]);
    expect(rows[0]).toMatchObject({ kind: "PULL_REQUEST", externalId: "pr:tma3084-2026/kenyalang:7", login: "ben02" });
  });
  it("reviews, skipping pending ones", () => {
    const rows = parseReviews(repo, 7, [
      { id: 1, html_url: "u", submitted_at: "2026-10-22T01:00:00Z", state: "CHANGES_REQUESTED", user: { login: "dayang04" } },
      { id: 2, html_url: "u", submitted_at: null, state: "PENDING", user: { login: "dayang04" } },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ externalId: "review:tma3084-2026/kenyalang:1", title: "Review of #7 (changes requested)" });
  });
  it("is safe with non-array responses", () => {
    expect(parseCommits(repo, { message: "Not Found" })).toEqual([]);
  });
});

describe("member mapping and counts", () => {
  it("maps logins case-insensitively from FORM-SI usernames", () => {
    const map = loginMap([
      { membershipId: "m1", githubUsername: "Aina01" },
      { membershipId: "m2", githubUsername: null },
    ]);
    expect(map.get("aina01")).toBe("m1");
    expect(map.size).toBe(1);
  });
  it("counts commits, PRs and reviews per member", () => {
    const c = githubCounts([
      { membershipId: "m1", kind: "COMMIT" },
      { membershipId: "m1", kind: "COMMIT" },
      { membershipId: "m1", kind: "REVIEW" },
      { membershipId: null, kind: "COMMIT" },
      { membershipId: "m2", kind: "PULL_REQUEST" },
    ]);
    expect(c.get("m1")).toEqual({ commits: 2, pullRequests: 0, reviews: 1 });
    expect(c.get("m2")).toEqual({ commits: 0, pullRequests: 1, reviews: 0 });
  });
});
