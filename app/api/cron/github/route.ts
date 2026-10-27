import { timingSafeEqual } from "node:crypto";
import { getEnv, githubEnabled } from "@/lib/env";
import { syncBatch } from "@/lib/server/github-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Daily GitHub refresh (Vercel Cron sends "Authorization: Bearer $CRON_SECRET"). */
export async function GET(req: Request) {
  if (!authorised(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!githubEnabled()) return Response.json({ skipped: "GITHUB_TOKEN is not set" });
  try {
    const results = await syncBatch();
    return Response.json({ synced: results.length, results });
  } catch (err) {
    console.error("cron github", err);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }
}
