/**
 * One-time first-run setup: creates a Lecturer account in the database given by DATABASE_URL
 * (run it against production once, from your own machine — see DEPLOY.md).
 * Prompts for the details, so no default password ever exists and nothing lands in shell history.
 *
 *   DATABASE_URL="postgres://…" npm run create-lecturer
 *   (add -- --additional to create another lecturer when one already exists)
 */
import readline from "node:readline";
import { Writable } from "node:stream";
import bcrypt from "bcryptjs";
import { scriptClient } from "./db-client";
import { emailSchema, passwordSchema } from "../lib/schemas/auth";

let muted = false;
const output = new Writable({
  write(chunk: Buffer, _enc, cb) {
    if (!muted) process.stdout.write(chunk);
    cb();
  },
});
const rl = readline.createInterface({ input: process.stdin, output, terminal: true });

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    muted = hidden;
    rl.question("", (answer) => {
      muted = false;
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const db = scriptClient();
  try {
    const existing = await db.user.count({ where: { appRole: "LECTURER" } });
    if (existing > 0 && !process.argv.includes("--additional")) {
      throw new Error("A lecturer account already exists. Use --additional to create another one.");
    }
    const name = (await ask("Full name: ")).trim();
    if (name.length < 2) throw new Error("Name is required.");
    const email = emailSchema.parse(await ask("E-mail: "));
    if (await db.user.findUnique({ where: { email } })) throw new Error("An account with this e-mail already exists.");
    const password = await ask("Password (min 10 chars, letters and a number): ", true);
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) throw new Error(pw.error.issues[0]?.message ?? "Invalid password.");
    if ((await ask("Repeat password: ", true)) !== password) throw new Error("Passwords do not match.");

    await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12), appRole: "LECTURER" } });
    console.info(`Lecturer account created for ${email}. Sign in at your APP_URL.`);
  } finally {
    rl.close();
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
