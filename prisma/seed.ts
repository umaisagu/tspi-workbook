/**
 * DEVELOPMENT SEED — wipes the database and loads sample data.
 * Refuses to run in production or against a non-local database (set SEED_ALLOW_REMOTE=yes
 * only for a disposable preview database, never production).
 *
 * All seeded accounts use the password printed at the end.
 */
import bcrypt from "bcryptjs";
import { scriptClient } from "../scripts/db-client";
import { MILESTONE_DEFAULTS, milestoneDueAt } from "../lib/tsp/milestones";
import type { TspiRole } from "../generated/prisma/enums";

const DEV_PASSWORD = "tspi-dev-2026";

function assertSafeToSeed() {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing to seed: this looks like production.");
  }
  const url = process.env.DATABASE_URL ?? "";
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local && process.env.SEED_ALLOW_REMOTE !== "yes") {
    throw new Error(`Refusing to seed non-local database host "${host}". Set SEED_ALLOW_REMOTE=yes only for a disposable preview database.`);
  }
}

interface SeedStudent {
  name: string;
  matric: string;
  roles: TspiRole[];
}

const TEAMS: { group: number; name: string; projectTitle: string; clientName: string; repoUrl: string; members: SeedStudent[] }[] = [
  {
    group: 1,
    name: "Kenyalang",
    projectTitle: "Smart Campus Lost & Found",
    clientName: "UNIMAS Student Affairs Division",
    repoUrl: "https://github.com/tma3084-2026/kenyalang-lost-found",
    members: [
      { name: "Aina Sofea binti Rahman", matric: "84001", roles: ["TEAM_LEADER"] },
      { name: "Benjamin Lee Wei Jie", matric: "84002", roles: ["DEVELOPMENT_MANAGER"] },
      { name: "Chong Mei Ling", matric: "84003", roles: ["PLANNING_MANAGER"] },
      { name: "Dayang Nurul Izzah", matric: "84004", roles: ["QUALITY_PROCESS_MANAGER"] },
      { name: "Elvis anak Jimbun", matric: "84005", roles: ["SUPPORT_MANAGER"] },
      { name: "Farhan Hakimi bin Yusof", matric: "84006", roles: ["DEVELOPMENT_MANAGER"] },
    ],
  },
  {
    group: 2,
    name: "Rafflesia",
    projectTitle: "Kuching Homestay Booking with AI Recommendations",
    clientName: "Kampung Budaya Homestay Association",
    repoUrl: "https://github.com/tma3084-2026/rafflesia-homestay",
    members: [
      { name: "Grace Ting Siew Hua", matric: "84011", roles: ["TEAM_LEADER"] },
      { name: "Haziq Danial bin Osman", matric: "84012", roles: ["DEVELOPMENT_MANAGER"] },
      { name: "Irene anak Kalong", matric: "84013", roles: ["PLANNING_MANAGER"] },
      { name: "Jason Wong Kah Seng", matric: "84014", roles: ["QUALITY_PROCESS_MANAGER"] },
      { name: "Kamilah binti Sapawi", matric: "84015", roles: ["SUPPORT_MANAGER"] },
    ],
  },
];

async function main() {
  assertSafeToSeed();
  const db = scriptClient();
  try {
    const tables = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    if (tables.length > 0) {
      await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
    }

    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
    const lecturer = await db.user.create({
      data: { name: "Dr. Lecturer (dev)", email: "lecturer@unimas.my", passwordHash, appRole: "LECTURER" },
    });
    const audit = { createdById: lecturer.id, updatedById: lecturer.id };

    const demonstrators = await Promise.all(
      [
        { name: "Demonstrator One (dev)", email: "demo1@siswa.unimas.my" },
        { name: "Demonstrator Two (dev)", email: "demo2@siswa.unimas.my" },
      ].map((d) => db.user.create({ data: { ...d, passwordHash, appRole: "DEMONSTRATOR", ...audit } })),
    );

    const week1Monday = new Date(Date.UTC(2026, 8, 21));
    const semester = await db.semester.create({
      data: {
        name: "Sem 1 2026/2027",
        week1Monday,
        weekCount: 15,
        breakWeeks: [8],
        isActive: true,
        ...audit,
        milestones: {
          create: MILESTONE_DEFAULTS.map((m) => ({
            code: m.code,
            title: m.title,
            week: m.week,
            dueAt: milestoneDueAt(m, week1Monday),
            requiredForms: m.requiredForms,
            ...audit,
          })),
        },
      },
    });

    const groups = await Promise.all(
      [1, 2].map((n) =>
        db.labGroup.create({
          data: {
            semesterId: semester.id,
            name: `Group ${n}`,
            schedule: "Wed 4–6 pm",
            ...audit,
            demonstrators: { create: { userId: demonstrators[n - 1]!.id, createdById: lecturer.id } },
          },
        }),
      ),
    );

    for (const t of TEAMS) {
      const team = await db.team.create({
        data: {
          labGroupId: groups[t.group - 1]!.id,
          name: t.name,
          projectTitle: t.projectTitle,
          clientName: t.clientName,
          repoUrl: t.repoUrl,
          ...audit,
        },
      });
      for (const s of t.members) {
        const user = await db.user.create({
          data: { name: s.name, email: `${s.matric}@siswa.unimas.my`, passwordHash, appRole: "STUDENT" },
        });
        await db.membership.create({
          data: {
            teamId: team.id,
            userId: user.id,
            joinedAt: new Date(Date.UTC(2026, 9, 7, 9)),
            ...audit,
            roles: { create: s.roles.map((role) => ({ role, createdById: lecturer.id })) },
          },
        });
      }
    }

    // A registered student who is not in a team yet.
    await db.user.create({ data: { name: "Lukas Chin (no team)", email: "84099@siswa.unimas.my", passwordHash } });

    console.info("Seed complete.");
    console.info(`  Lecturer:      lecturer@unimas.my`);
    console.info(`  Demonstrators: demo1@siswa.unimas.my (Group 1), demo2@siswa.unimas.my (Group 2)`);
    console.info(`  Team leaders:  84001@siswa.unimas.my (Kenyalang), 84011@siswa.unimas.my (Rafflesia)`);
    console.info(`  Members:       84002-84006, 84012-84015 @siswa.unimas.my; no team: 84099@siswa.unimas.my`);
    console.info(`  Password for every seeded account: ${DEV_PASSWORD}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
