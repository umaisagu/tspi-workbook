/**
 * Loads the TMA3084 2026/2027 S1 lecture series into the ACTIVE semester of the database given by DATABASE_URL /
 * DIRECT_URL. Idempotent: adds missing lectures, resources and check questions; never overwrites edits, never deletes,
 * never touches students' views. Unlike `npm run db:seed` it is safe on production (it only adds lecture content).
 *
 *   npm run seed-lectures -- --dry-run     # show what would be added
 *   npm run seed-lectures                  # add it
 */
import { scriptClient } from "./db-client";
import { loadSeries } from "../lib/lectures/load-series";
import { SERIES_2026_S1 } from "../lib/lectures/series-2026-s1";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = scriptClient();
  try {
    const semesters = await db.semester.findMany({ where: { isActive: true }, select: { id: true, name: true } });
    if (semesters.length !== 1) throw new Error(`Expected exactly one active semester, found ${semesters.length}. Activate one on the Admin page first.`);
    const semester = semesters[0]!;
    const plan = await loadSeries(db, semester.id, SERIES_2026_S1, { dryRun });
    const verb = dryRun ? "Would add" : "Added";
    console.info(`${semester.name}: ${verb} ${plan.create.length} lecture(s)${plan.create.length ? ` (${plan.create.map((l) => l.code).join(", ")})` : ""}.`);
    for (const a of plan.addResources) console.info(`  ${a.code}: ${verb.toLowerCase()} ${a.resources.length} resource(s)`);
    for (const c of plan.addChecks) console.info(`  ${c.code}: ${verb.toLowerCase()} the check question`);
    console.info(`${plan.unchanged} lecture(s) already complete, left as they are.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
