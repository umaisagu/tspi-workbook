import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/** Prisma client for command-line scripts (seed, create-lecturer). */
export function scriptClient(url = process.env.DATABASE_URL): PrismaClient {
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env or export it.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
