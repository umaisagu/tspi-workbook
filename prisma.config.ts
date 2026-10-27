import "./scripts/load-env";
import { defineConfig } from "prisma/config";
import { directDatabaseUrl } from "./lib/deploy/db-urls";

// The CLI (migrate, studio) uses the direct, non-pooled connection (DIRECT_URL or Neon's DATABASE_URL_UNPOOLED).
// The app itself connects with DATABASE_URL (pooled) through the pg driver adapter in lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: directDatabaseUrl() ?? "",
  },
});
