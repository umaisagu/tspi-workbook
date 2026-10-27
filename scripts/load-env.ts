import { config } from "dotenv";

// Command-line tools (Prisma CLI, seed, scripts) read the same files as Next.js: .env.local (written by
// `neon deploy` / `neon env pull`) first, then .env. Variables already set in the shell win over both.
config({ path: [".env.local", ".env"], quiet: true });
