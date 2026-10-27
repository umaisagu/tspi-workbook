/**
 * Connection strings. The app uses DATABASE_URL (pooled). Migrations, the build guard and backups need the
 * direct (non-pooled) connection: DIRECT_URL, or DATABASE_URL_UNPOOLED as written by `neon env pull` /
 * `neon deploy` and Vercel's Neon integration; DATABASE_URL as a last resort (fine locally, where there is no pooler).
 */
type Env = Record<string, string | undefined>;

const set = (v: string | undefined) => (v && v.trim() !== "" ? v : undefined);

export function directDatabaseUrl(env: Env = process.env): string | undefined {
  return set(env.DIRECT_URL) ?? set(env.DATABASE_URL_UNPOOLED) ?? set(env.DATABASE_URL);
}

/** True when a direct connection string is configured explicitly (not just the pooled fallback). */
export function hasDirectUrl(env: Env = process.env): boolean {
  return set(env.DIRECT_URL) !== undefined || set(env.DATABASE_URL_UNPOOLED) !== undefined;
}

/**
 * What is wrong with a connection-string value, or null when it looks right. A value with anything around the URL
 * (quotes, a `DATABASE_URL=` prefix, a `psql '…'` command, a comment line) otherwise surfaces as the baffling
 * "Can't reach database server at base".
 */
export function connectionStringProblem(name: string, value: string | undefined): string | null {
  if (value === undefined || value.trim() === "") return null;
  const v = value.trim();
  if (/^postgres(ql)?:\/\/[^\s"']+$/.test(v)) return null;
  const hints: string[] = [];
  if (/["']/.test(v)) hints.push("remove the quotes");
  if (/\b[A-Z_]+=/.test(v)) hints.push(`remove the "${v.match(/\b([A-Z_]+)=/)?.[1]}=" prefix`);
  if (/^psql\b/.test(v)) hints.push("paste only the URL, not the psql command");
  if (/\s/.test(v) && hints.length === 0) hints.push("remove spaces, line breaks and comments");
  return (
    `${name} must be just the connection string, starting with postgresql:// and with nothing around it` +
    (hints.length ? ` (${hints.join("; ")})` : "") +
    `. In Neon: Connect → snippet type "Connection string" → copy.`
  );
}
