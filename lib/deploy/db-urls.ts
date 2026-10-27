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
