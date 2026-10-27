/**
 * Build guard: `check` runs before `prisma migrate deploy`, `mark` after it.
 * Stops the build when the database belongs to another environment (e.g. a preview build pointed at production).
 * Uses the direct connection (DIRECT_URL or DATABASE_URL_UNPOOLED, like the migration), else DATABASE_URL.
 */
import { directDatabaseUrl } from "../lib/deploy/db-urls";
import { checkTarget, deployTarget } from "../lib/deploy/target";
import { scriptClient } from "./db-client";

async function main() {
  const mode = process.argv[2];
  if (mode !== "check" && mode !== "mark") throw new Error("Usage: tsx scripts/deploy-target.ts check|mark");
  const target = deployTarget(process.env.VERCEL_ENV);
  const db = scriptClient(directDatabaseUrl());
  try {
    const rows = await db.$queryRaw<{ exists: boolean }[]>`SELECT to_regclass('public."AppMeta"') IS NOT NULL AS exists`;
    const exists = rows[0]?.exists === true;
    const marker = exists ? ((await db.appMeta.findUnique({ where: { key: "environment" } }))?.value ?? null) : null;
    const result = checkTarget(target, marker);
    if (!result.ok) {
      console.error(`\n✖ Deploy target check failed.\n  ${result.message}\n`);
      process.exitCode = 1;
      return;
    }
    if (mode === "mark" && result.mark) {
      await db.appMeta.upsert({ where: { key: "environment" }, create: { key: "environment", value: result.mark }, update: {} });
      console.info(`Database marked as "${result.mark}".`);
    } else {
      console.info(`Deploy target OK: ${target} build, database ${marker ? `marked "${marker}"` : "not marked yet"}.`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
