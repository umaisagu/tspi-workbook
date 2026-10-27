/**
 * Off-site backup: `npm run backup` writes a compressed pg_dump (custom format) to ./backups and checks
 * that pg_restore can read it. Needs PostgreSQL client tools (pg_dump/pg_restore) at least as new as the server.
 * Database: BACKUP_DATABASE_URL, else DIRECT_URL, else DATABASE_URL — use Neon's direct (non-pooled) connection.
 * Restore into a new, empty database: pg_restore --no-owner --no-acl -d "<new database url>" <file>.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { backupFileName, isPooledUrl, redactUrl } from "../lib/deploy/backup";

function main() {
  const url = process.env.BACKUP_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Set BACKUP_DATABASE_URL (Neon direct connection string) or DIRECT_URL.");
  if (isPooledUrl(url)) throw new Error('This is a pooled connection ("-pooler" in the host). Use the direct connection string for backups.');
  const dir = path.resolve("backups");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, backupFileName(url, new Date()));
  console.info(`Backing up ${redactUrl(url)}\n  → ${file}`);

  const dump = spawnSync("pg_dump", ["--format=custom", "--compress=9", "--no-owner", "--no-acl", `--file=${file}`, url], { stdio: ["ignore", "inherit", "inherit"] });
  if (dump.error) throw new Error(`Could not run pg_dump (${dump.error.message}). Install the PostgreSQL client tools.`);
  if (dump.status !== 0) throw new Error(`pg_dump failed with exit code ${dump.status}.`);

  const list = spawnSync("pg_restore", ["--list", file], { encoding: "utf8" });
  if (list.status !== 0) throw new Error(`pg_restore could not read the backup: ${list.stderr}`);
  const tables = list.stdout.split("\n").filter((l) => / TABLE DATA /.test(l)).length;
  const mb = (statSync(file).size / 1024 / 1024).toFixed(2);
  console.info(`Done: ${mb} MB, ${tables} tables. The file contains personal data: store it encrypted and never commit it.`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
