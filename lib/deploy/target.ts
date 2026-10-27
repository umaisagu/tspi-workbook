/**
 * Which environment a database belongs to, so a preview build can never migrate or serve the production
 * database (and the other way round). The marker is written on the first build against a database.
 */
export type DeployTarget = "production" | "preview" | "development";

export function deployTarget(vercelEnv: string | undefined): DeployTarget {
  return vercelEnv === "production" || vercelEnv === "preview" ? vercelEnv : "development";
}

export type TargetCheck = { ok: true; mark: DeployTarget | null } | { ok: false; message: string };

/** `marker` is the database's stored environment (null when not yet marked). */
export function checkTarget(target: DeployTarget, marker: string | null): TargetCheck {
  if (marker === null) return { ok: true, mark: target };
  if (marker === target) return { ok: true, mark: null };
  return {
    ok: false,
    message:
      `This database is marked "${marker}", but this is a ${target} build. ` +
      `Check DATABASE_URL and DIRECT_URL for the ${target} environment in Vercel (each environment needs its own Neon database). ` +
      `Nothing was changed. See DEPLOY.md, "Environments".`,
  };
}

/** The seed wipes the database: never on one marked production. */
export function seedAllowed(marker: string | null): boolean {
  return marker !== "production";
}
