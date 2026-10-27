import { z } from "@/lib/schemas/zod";
import { githubEnabled } from "@/lib/env";
import { requireLecturer } from "@/lib/server/guards";
import { syncBatch, syncTeam } from "@/lib/server/github-sync";
import { HttpError, ok, parseJson, route } from "@/lib/server/http";

/** Lecturer: refresh one team's GitHub data now, or the next batch of teams. */
export const POST = route(async (req) => {
  await requireLecturer();
  if (!githubEnabled()) throw new HttpError(400, "GitHub is not connected (GITHUB_TOKEN is not set).");
  const { teamId } = await parseJson(req, z.object({ teamId: z.string().optional() }));
  return ok(teamId ? [await syncTeam(teamId)] : await syncBatch());
});
