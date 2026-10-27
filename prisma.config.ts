import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate, studio) uses the direct, non-pooled connection.
// The app itself connects with DATABASE_URL (pooled) through the pg driver adapter in lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
