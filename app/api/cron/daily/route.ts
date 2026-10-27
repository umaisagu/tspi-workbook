import { timingSafeEqual } from "node:crypto";
import { getEnv, githubEnabled } from "@/lib/env";
import { syncBatch } from "@/lib/server/github-sync";
import { cleanup } from "@/lib/server/maintenance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Daily job (vercel.json; Vercel Cron sends "Authorization: Bearer $CRON_SECRET"):
 * housekeeping, then GitHub for as many teams as fit in the time budget (least recently synced first).
 */
export async function GET(req: Request) {
  if (!authorised(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const out: { cleanup?: Awaited<ReturnType<typeof cleanup>>; github?: unknown; errors: string[] } = { errors: [] };
  try {
    out.cleanup = await cleanup();
  } catch (err) {
    console.error("cron cleanup", err);
    out.errors.push("cleanup failed");
  }
  if (!githubEnabled()) out.github = "skipped: GITHUB_TOKEN is not set";
  else {
    try {
      const results = await syncBatch({ maxTeams: 200, budgetMs: 45_000 });
      out.github = { synced: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).map((r) => ({ teamId: r.teamId, error: r.error })) };
    } catch (err) {
      console.error("cron github", err);
      out.errors.push("GitHub sync failed");
    }
  }
  return Response.json(out, { status: out.errors.length ? 500 : 200 });
}
