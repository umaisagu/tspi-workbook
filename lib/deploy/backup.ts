/** Pure helpers for scripts/backup.ts. */

/** Neon's pooled hosts contain "-pooler"; pg_dump needs the direct connection. */
export function isPooledUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("-pooler");
  } catch {
    return false;
  }
}

/** backups/tspi-<db host label>-YYYYMMDD-HHMM.dump (UTC). */
export function backupFileName(url: string, now: Date): string {
  let host = "db";
  try {
    host = new URL(url).hostname.split(".")[0]!.replace(/[^A-Za-z0-9-]/g, "") || "db";
  } catch {
    // keep the default
  }
  const t = now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 13);
  return `tspi-${host}-${t}.dump`;
}

/** The database URL without its password, for log output. */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(invalid URL)";
  }
}
