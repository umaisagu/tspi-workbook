import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

// One client per server instance. Runtime uses the pooled DATABASE_URL (Neon "-pooler" host) through
// node-postgres; migrations use the direct connection (see prisma.config.ts).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const pool = new Pool({ connectionString: getEnv().DATABASE_URL });
  // On Vercel (Fluid compute) keeps the function alive until idle connections are closed, so suspended
  // instances don't leak connections; a no-op anywhere else.
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
