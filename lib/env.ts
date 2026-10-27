import { z } from "@/lib/schemas/zod";
import { connectionStringProblem } from "@/lib/deploy/db-urls";

/**
 * Environment variables, validated once. Required variables missing → a clear error at startup
 * (instrumentation.ts calls getEnv() when the server boots).
 * On Vercel (VERCEL_ENV set) SMTP and CRON_SECRET are required too; locally they are optional
 * and password-reset links are printed to the server log instead of e-mailed.
 */
const onVercel = Boolean(process.env.VERCEL_ENV);

const optional = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === "" ? undefined : v));

const baseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Neon pooled connection string)"),
  DIRECT_URL: optional,
  /** Neon's name for the direct connection (neon env pull, Vercel's Neon integration); same role as DIRECT_URL. */
  DATABASE_URL_UNPOOLED: optional,
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET is required and must be at least 32 characters (openssl rand -base64 32)"),
  APP_URL: z.url("APP_URL is required, e.g. https://tspi-workbook.vercel.app"),
  ALLOWED_EMAIL_DOMAINS: z
    .string()
    .optional()
    .transform((v) =>
      (v && v.trim() !== "" ? v : "siswa.unimas.my,unimas.my")
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter((d) => d.length > 0),
    ),
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  SMTP_FROM: optional,
  SMTP_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  GITHUB_TOKEN: optional,
  CRON_SECRET: optional,
});

export type Env = z.infer<typeof baseSchema>;

const vercelRequired = ["SMTP_HOST", "SMTP_PORT", "SMTP_FROM", "CRON_SECRET"] as const;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = baseSchema.safeParse(process.env);
  const problems: string[] = [];
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      problems.push(`${issue.path.join(".")}: ${issue.message}`);
    }
  } else if (onVercel) {
    for (const key of vercelRequired) {
      if (parsed.data[key] === undefined) problems.push(`${key}: required on Vercel deployments`);
    }
    if (parsed.data.DIRECT_URL === undefined && parsed.data.DATABASE_URL_UNPOOLED === undefined) {
      problems.push("DIRECT_URL (or DATABASE_URL_UNPOOLED): the direct Neon connection is required on Vercel deployments");
    }
  }
  if (parsed.success) {
    for (const key of ["DATABASE_URL", "DIRECT_URL", "DATABASE_URL_UNPOOLED"] as const) {
      const problem = connectionStringProblem(key, parsed.data[key]);
      if (problem) problems.push(problem);
    }
  }
  if (problems.length > 0 || !parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n  - ${problems.join("\n  - ")}\nSee .env.example and DEPLOY.md.`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function githubEnabled(): boolean {
  return getEnv().GITHUB_TOKEN !== undefined;
}
