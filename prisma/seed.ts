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
import { seedLogs, type Profile, type SeedMember } from "./seed-logs";
import { seedPlan } from "./seed-plan";
import { seedTeamForms } from "./seed-team-forms";
import { seedGithub } from "./seed-github";
import { seedAllowed } from "../lib/deploy/target";
import type { SeedComponent } from "./seed-logs";
import { localDate, weekOf } from "../lib/tsp/calendar";

const localWeek = (week1: Date) => weekOf(localDate(new Date()), week1);

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
  profile: Profile;
  focus: SeedMember["focus"];
  si?: SeedMember["siSubmitted"];
}

const TEAMS: {
  group: number;
  name: string;
  projectTitle: string;
  clientName: string;
  repoUrl: string;
  components: string[];
  members: SeedStudent[];
}[] = [
  {
    group: 1,
    name: "Kenyalang",
    projectTitle: "Smart Campus Lost & Found",
    clientName: "UNIMAS Student Affairs Division",
    repoUrl: "https://github.com/tma3084-2026/kenyalang-lost-found",
    components: ["Authentication", "Item Listing", "AI Image Matching", "Notifications"],
    members: [
      { name: "Aina Sofea binti Rahman", matric: "84001", roles: ["TEAM_LEADER"], profile: "normal", focus: "lead" },
      { name: "Benjamin Lee Wei Jie", matric: "84002", roles: ["DEVELOPMENT_MANAGER"], profile: "high", focus: "dev" },
      { name: "Chong Mei Ling", matric: "84003", roles: ["PLANNING_MANAGER"], profile: "normal", focus: "plan" },
      { name: "Dayang Nurul Izzah", matric: "84004", roles: ["QUALITY_PROCESS_MANAGER"], profile: "normal", focus: "qa" },
      { name: "Elvis anak Jimbun", matric: "84005", roles: ["SUPPORT_MANAGER"], profile: "inactive", focus: "support", si: "late" },
      { name: "Farhan Hakimi bin Yusof", matric: "84006", roles: ["DEVELOPMENT_MANAGER"], profile: "low", focus: "dev" },
    ],
  },
  {
    group: 2,
    name: "Rafflesia",
    projectTitle: "Kuching Homestay Booking with AI Recommendations",
    clientName: "Kampung Budaya Homestay Association",
    repoUrl: "https://github.com/tma3084-2026/rafflesia-homestay",
    components: ["Authentication", "Booking", "AI Recommendations", "Payments"],
    members: [
      { name: "Grace Ting Siew Hua", matric: "84011", roles: ["TEAM_LEADER"], profile: "normal", focus: "lead" },
      { name: "Haziq Danial bin Osman", matric: "84012", roles: ["DEVELOPMENT_MANAGER"], profile: "backfill", focus: "dev" },
      { name: "Irene anak Kalong", matric: "84013", roles: ["PLANNING_MANAGER"], profile: "normal", focus: "plan" },
      { name: "Jason Wong Kah Seng", matric: "84014", roles: ["QUALITY_PROCESS_MANAGER"], profile: "high", focus: "qa" },
      { name: "Kamilah binti Sapawi", matric: "84015", roles: ["SUPPORT_MANAGER"], profile: "normal", focus: "support", si: "missing" },
    ],
  },
];

async function main() {
  assertSafeToSeed();
  const db = scriptClient();
  try {
    const marker = (await db.appMeta.findUnique({ where: { key: "environment" } }))?.value ?? null;
    if (!seedAllowed(marker)) throw new Error("Refusing to seed: this database is marked as production.");
    // AppMeta (the environment marker) is kept.
    const tables = await db.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'AppMeta')`;
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
            // Seed only: M1 also collects PEER so monitoring has ratings to show this early in the semester.
            requiredForms: m.code === "M1" ? [...m.requiredForms, "PEER" as const] : m.requiredForms,
            peerRequired: m.code === "M1" || m.requiredForms.includes("PEER"),
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

    const milestones = await db.milestone.findMany({ where: { semesterId: semester.id }, orderBy: { dueAt: "asc" } });
    const now = new Date();
    const past = milestones.filter((m) => m.dueAt <= now);
    const latestDeadline = past.at(-1)?.dueAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let seedNo = 1;
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
      const members: SeedMember[] = [];
      for (const s of t.members) {
        const user = await db.user.create({
          data: { name: s.name, email: `${s.matric}@siswa.unimas.my`, passwordHash, appRole: "STUDENT" },
        });
        const membership = await db.membership.create({
          data: {
            teamId: team.id,
            userId: user.id,
            joinedAt: new Date(Date.UTC(2026, 9, 7, 9)),
            ...audit,
            roles: { create: s.roles.map((role) => ({ role, createdById: lecturer.id })) },
          },
        });
        members.push({
          membershipId: membership.id,
          userId: user.id,
          name: s.name,
          matric: s.matric,
          profile: s.profile,
          focus: s.focus,
          siSubmitted: s.si ?? "onTime",
        });
      }
      const leader = members[0]!;
      // Components: SRS (requirements pages), SDS (HLD pages) and the app's code assemblies (LOC).
      // Actual sizes reflect progress so far: documents mostly done, code just started.
      const progress = Math.max(0, Math.min(1, (localWeek(week1Monday) - 5) / 9));
      const components: SeedComponent[] = [];
      const doc = async (name: string, measure: "REQ_PAGES" | "HLD_PAGES", plan: number, actual: number, role: SeedComponent["role"]) => {
        const c = await db.component.create({
          data: { teamId: team.id, name, sizeMeasure: measure, planAdded: plan, actAdded: actual, createdById: leader.userId, updatedById: leader.userId },
        });
        components.push({ id: c.id, name, role, ownerMembershipId: null });
      };
      await doc("SRS & Proposal", "REQ_PAGES", 30, localWeek(week1Monday) >= 5 ? 27 : 12, "req");
      await doc("SDS & Design", "HLD_PAGES", 24, localWeek(week1Monday) >= 6 ? 9 : 0, "design");
      for (const [i, name] of t.components.entries()) {
        const owner = members[(i + 1) % members.length]!;
        const planAdded = 600 + i * 150;
        const c = await db.component.create({
          data: {
            teamId: team.id,
            name,
            kind: "ASSEMBLY",
            sizeMeasure: "LOC",
            ownerMembershipId: owner.membershipId,
            planAdded,
            planReused: i === 0 ? 120 : 0,
            planNewReuse: i === 0 ? 0 : 40,
            actAdded: Math.round(planAdded * progress * (0.6 + 0.2 * i)),
            actReused: i === 0 && progress > 0 ? 120 : 0,
            createdById: leader.userId,
            updatedById: leader.userId,
          },
        });
        components.push({ id: c.id, name, role: "code", ownerMembershipId: owner.membershipId });
      }
      const tasks = await seedPlan(db, {
        teamId: team.id,
        members,
        components,
        week1: week1Monday,
        weekCount: semester.weekCount,
        breakWeeks: semester.breakWeeks,
        seed: 3000 + seedNo,
      });
      const { currentWeek } = await seedLogs(db, {
        teamId: team.id,
        members,
        tasks,
        components,
        week1: week1Monday,
        breakWeeks: semester.breakWeeks,
        latestDeadline,
        seed: 2026 + seedNo++,
      });
      const m1 = milestones.find((m) => m.code === "M1")!;
      await seedTeamForms(db, {
        teamId: team.id,
        members,
        components,
        week1: week1Monday,
        weekCount: semester.weekCount,
        breakWeeks: semester.breakWeeks,
        m1: { id: m1.id, dueAt: m1.dueAt },
        lateWeekReports: t.name === "Rafflesia",
        seed: 5000 + seedNo,
      });
      await seedGithub(db, {
        teamId: team.id,
        repo: t.repoUrl.replace("https://github.com/", ""),
        members,
        week1: week1Monday,
        currentWeek,
        breakWeeks: semester.breakWeeks,
        seed: 7000 + seedNo,
      });
      const demonstrator = demonstrators[t.group - 1]!;
      const quiet = members.find((m) => m.profile === "inactive");
      if (quiet) {
        await db.formComment.create({
          data: {
            teamId: team.id,
            formType: "LOGT",
            membershipId: quiet.membershipId,
            authorId: demonstrator.id,
            body: `No time recorded since week ${currentWeek - 2}. Please update your LOGT before the next lab.`,
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
    console.info(`  Unusual on purpose: 84005 Elvis (inactive last 2 weeks, no PEER), 84012 Haziq (backfilled LOGT before ${latestDeadline.toISOString()}, late PEER),`);
    console.info(`                     84006 Farhan (low hours, rates himself far above teammates' ratings), 84015 Kamilah (FORM-SI not submitted),`);
    console.info(`                     Kenyalang submits WEEK reports on time; Rafflesia's week 5 report is a draft (late once its deadline passes)`);
    console.info(`  GitHub activity is cached seed data (repos are fictional); the team detail page shows it when GITHUB_TOKEN is set`);
    console.info(`  Password for every seeded account: ${DEV_PASSWORD}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
