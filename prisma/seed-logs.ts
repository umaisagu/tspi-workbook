/**
 * Development seed: generated FORM-SI, LOGT, LOGD and LOGAI data.
 * Deterministic (seeded PRNG) and relative to "today", so the data always runs up to the current week.
 * Two members are deliberately unusual, for the contribution flags:
 *  - inactive:  logs normally, then nothing for the last two weeks;
 *  - backfill:  logs nothing, then enters many past-dated sessions in one sitting shortly before the latest deadline.
 */
import type { Phase, PrismaClient } from "../generated/prisma/client";
import { formatDateOnly, localDate, myTime, weekStart } from "../lib/tsp/calendar";
import { formatAiCode } from "../lib/tsp/ai-log";
import { COMMITMENT_DAYS, COMMITMENT_SLOTS, SKILL_AREAS } from "../lib/tsp/student-info";

export type Profile = "normal" | "high" | "low" | "inactive" | "backfill";

export interface SeedMember {
  membershipId: string;
  userId: string;
  name: string;
  matric: string;
  profile: Profile;
  focus: "lead" | "dev" | "plan" | "qa" | "support";
  siSubmitted: "onTime" | "late" | "missing";
}

/** mulberry32 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PHASES_BY_WEEK: Record<number, Phase[]> = {
  3: ["STRAT", "PLAN", "MGMT"],
  4: ["PLAN", "REQ", "MGMT"],
  5: ["REQ", "REQINSP", "STP", "DOC"],
  6: ["HLD", "HLDINSP", "DLD", "CODE", "MGMT"],
  7: ["DLD", "CODE", "CR", "TD", "UT"],
  9: ["CODE", "CR", "UT", "IT"],
  10: ["CODE", "CR", "UT", "IT"],
  11: ["CODE", "UT", "IT", "ST"],
  12: ["CODE", "UT", "IT", "ST", "DOC"],
  13: ["IT", "ST", "DOC"],
  14: ["ST", "DOC", "PM"],
  15: ["DOC", "PM"],
};
const FOCUS_PHASES: Record<SeedMember["focus"], Phase[]> = {
  lead: ["MGMT", "PLAN"],
  dev: ["CODE", "DLD"],
  plan: ["PLAN", "REQ"],
  qa: ["UT", "TD", "REQINSP"],
  support: ["DOC", "MGMT"],
};
const HOURS_PER_WEEK: Record<Profile, number> = { normal: 5, high: 7.5, low: 2.5, inactive: 4, backfill: 4.5 };
const DOC_PHASES: Phase[] = ["STRAT", "PLAN", "REQ", "STP", "REQINSP", "HLD", "HLDINSP", "ITP", "DOC", "PM"];

function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)]!;
}

interface Session {
  date: Date;
  startMin: number;
  stopMin: number;
  interruptMin: number;
  phase: Phase;
}

function sessionsForWeek(r: () => number, week: number, member: SeedMember, week1: Date, today: Date): Session[] {
  const phases = PHASES_BY_WEEK[week];
  if (!phases) return [];
  const target = HOURS_PER_WEEK[member.profile] * (0.7 + r() * 0.6) * 60;
  const out: Session[] = [];
  let total = 0;
  const monday = weekStart(week, week1);
  while (total < target) {
    const date = new Date(monday.getTime() + Math.floor(r() * 7) * 86400000);
    if (date.getTime() > today.getTime()) {
      if (out.length === 0 && r() < 0.5) continue;
      break;
    }
    const startMin = (9 + Math.floor(r() * 12)) * 60 + pick(r, [0, 15, 30, 45]);
    const length = 45 + Math.floor(r() * 9) * 15;
    const stopMin = Math.min(startMin + length, 23 * 60 + 45);
    const interruptMin = r() < 0.4 ? pick(r, [5, 10, 15, 20]) : 0;
    if (stopMin - startMin - interruptMin < 20) continue;
    const sameDay = out.filter((o) => o.date.getTime() === date.getTime());
    if (sameDay.some((o) => startMin < o.stopMin && o.startMin < stopMin)) continue;
    const focus = FOCUS_PHASES[member.focus].filter((p) => phases.includes(p));
    const phase = focus.length > 0 && r() < 0.5 ? pick(r, focus) : pick(r, phases);
    out.push({ date, startMin, stopMin, interruptMin, phase });
    total += stopMin - startMin - interruptMin;
  }
  return out;
}

export async function seedLogs(
  db: PrismaClient,
  opts: {
    teamId: string;
    members: SeedMember[];
    components: { id: string; name: string; code: boolean }[];
    /** TASK rows to link LOGT sessions to (same phase, own tasks first, nearest plan week). */
    tasks?: { id: string; phase: Phase; planWeek: number | null; assigneeId: string }[];
    week1: Date;
    breakWeeks: number[];
    latestDeadline: Date;
    seed: number;
  },
) {
  const r = rng(opts.seed);
  const now = new Date();
  const today = localDate(now);
  const currentWeek = Math.max(3, Math.min(15, Math.floor((today.getTime() - opts.week1.getTime()) / (7 * 86400000)) + 1));
  const docComponent = opts.components.find((c) => !c.code);
  const codeComponents = opts.components.filter((c) => c.code);

  for (const m of opts.members) {
    const audit = { createdById: m.userId, updatedById: m.userId };

    // ----- LOGT -----
    for (let week = 3; week <= currentWeek; week++) {
      if (opts.breakWeeks.includes(week)) continue;
      if (m.profile === "inactive" && week > currentWeek - 2) continue;
      const backfilled = m.profile === "backfill" && myTime(weekStart(week, opts.week1), 0, 0) < opts.latestDeadline;
      for (const s of sessionsForWeek(r, week, m, opts.week1, today)) {
        const samePhase = (opts.tasks ?? []).filter((t) => t.phase === s.phase);
        const own = samePhase.filter((t) => t.assigneeId === m.membershipId);
        const candidates = own.length > 0 ? own : samePhase;
        candidates.sort((a, b) => Math.abs((a.planWeek ?? 99) - week) - Math.abs((b.planWeek ?? 99) - week));
        const taskId = candidates.length > 0 && r() < 0.85 ? candidates[0]!.id : null;
        const componentId = DOC_PHASES.includes(s.phase) ? (docComponent?.id ?? null) : s.phase === "MGMT" ? null : pick(r, codeComponents).id;
        const loggedAt = backfilled
          ? // all entered in one evening session, an hour or two before the deadline
            new Date(opts.latestDeadline.getTime() - (3 * 60 - Math.floor(r() * 80)) * 60000)
          : new Date(myTime(s.date, 0, 0).getTime() + (s.stopMin + 5 + Math.floor(r() * 60)) * 60000);
        await db.timeLog.create({
          data: {
            membershipId: m.membershipId,
            date: s.date,
            startMin: s.startMin,
            stopMin: s.stopMin,
            interruptMin: s.interruptMin,
            deltaMin: s.stopMin - s.startMin - s.interruptMin,
            phase: s.phase,
            componentId,
            taskId,
            comments: pick(r, [null, null, "Team meeting", "Pair programming", "Client meeting prep", "Lab session", "Reading docs"]),
            createdAt: loggedAt > now ? now : loggedAt,
            updatedAt: loggedAt > now ? now : loggedAt,
            ...audit,
          },
        });
      }
    }

    // ----- LOGD -----
    if (m.profile !== "inactive") {
      const defects: { week: number; type: number; inj: Phase; rem: Phase; desc: string }[] = [];
      if (currentWeek >= 5 && (m.focus === "qa" || m.focus === "plan")) {
        defects.push({ week: 5, type: 10, inj: "REQ", rem: "REQINSP", desc: "FR-04 acceptance criteria missing" });
        defects.push({ week: 5, type: 10, inj: "REQ", rem: "REQINSP", desc: "Ambiguous wording in non-functional requirement NFR-02" });
      }
      if (currentWeek >= 6 && (m.focus === "dev" || m.focus === "qa")) {
        defects.push({ week: 6, type: 50, inj: "HLD", rem: "HLDINSP", desc: "Service interface for AI feature does not match SDS sequence diagram" });
      }
      if (currentWeek >= 7 && m.focus === "dev") {
        defects.push({ week: 7, type: 80, inj: "CODE", rem: "CR", desc: "Null check missing on optional API field" });
        defects.push({ week: 7, type: 70, inj: "CODE", rem: "UT", desc: "Date parsed in UTC instead of local time" });
      }
      let number = 0;
      for (const d of defects) {
        number++;
        const date = new Date(weekStart(d.week, opts.week1).getTime() + Math.floor(r() * 5) * 86400000);
        if (date > today) continue;
        const at = new Date(myTime(date, 18 + Math.floor(r() * 4), 0));
        await db.defectLog.create({
          data: {
            membershipId: m.membershipId,
            number,
            date,
            type: d.type,
            componentId: DOC_PHASES.includes(d.inj) ? (docComponent?.id ?? null) : pick(r, codeComponents).id,
            phaseInjected: d.inj,
            phaseRemoved: d.rem,
            fixTimeMin: 5 + Math.floor(r() * 40),
            description: d.desc,
            createdAt: at > now ? now : at,
            updatedAt: at > now ? now : at,
            ...audit,
          },
        });
      }
    }

    // ----- LOGAI (from Lab 04, week 6) -----
    if (m.profile !== "inactive" && currentWeek >= 6) {
      const entries = m.profile === "low" ? 1 : 2;
      for (let i = 1; i <= entries; i++) {
        const week = Math.min(currentWeek, 6 + (i - 1) * 3);
        const date = new Date(Math.min(weekStart(week, opts.week1).getTime() + (i === 1 ? 2 : 1) * 86400000, today.getTime()));
        const others = opts.members.filter((o) => o.membershipId !== m.membershipId && o.profile !== "inactive");
        const reviewer = pick(r, others);
        const at = new Date(myTime(date, 21, 0));
        const approved = r() < 0.6;
        await db.aiLog.create({
          data: {
            membershipId: m.membershipId,
            code: formatAiCode(i),
            date,
            module: i === 1 ? "FR-03 Order Summary screen (Vibe Coding Task 4)" : "FR-07 AI service class with timeout and fallback",
            tool: pick(r, ["Claude", "Codex (ChatGPT)"]),
            model: pick(r, ["claude-sonnet (free plan)", "gpt-5-codex"]),
            promptSpec:
              "Requirement FR-03. Expected behaviour: show the items, quantities and total before checkout.\nAcceptance criteria: (1) total updates when quantity changes; (2) empty state message; (3) Back returns to the menu.\nConstraints: Material 3, no new packages.",
            outputSummary: "Generated OrderSummaryScreen widget, route registration and a basic widget test.",
            humanRefinement: "Renamed widgets to our naming convention, replaced hard-coded colours with ColorScheme, rejected a setState inside build().",
            testEvidence: "widget_test/order_summary_test.dart: 3 tests pass locally and in CI.",
            prUrl: `https://github.com/tma3084-2026/demo/pull/${10 + Math.floor(r() * 40)}`,
            reviewerMembershipId: reviewer.membershipId,
            approved,
            approvedAt: approved ? (at > now ? now : at) : null,
            createdAt: at > now ? now : at,
            updatedAt: at > now ? now : at,
            ...audit,
          },
        });
      }
    }

    // ----- FORM-SI -----
    if (m.siSubmitted !== "missing") {
      const date = new Date(opts.week1.getTime() + (m.siSubmitted === "onTime" ? 16 : 23) * 86400000); // Wed week 3 / week 4
      const at = myTime(date, 16, 30);
      const grid = Object.fromEntries(
        COMMITMENT_SLOTS.map((slot) => [slot, Object.fromEntries(COMMITMENT_DAYS.map((d) => [d, d !== "Sat" && d !== "Sun" && r() < 0.35 ? "C" : r() < 0.05 ? "W" : ""]))]),
      );
      grid["16-18"]!.Wed = "";
      await db.studentInfo.create({
        data: {
          membershipId: m.membershipId,
          fullName: m.name,
          matricNo: m.matric,
          date,
          programme: pick(r, ["Software Engineering", "Computational Science", "Network Computing"]),
          yearOfStudy: 3,
          creditsRegistered: 15 + Math.floor(r() * 5),
          expectedGradSemester: 2,
          expectedGradYear: 2028,
          phone: `01${Math.floor(10000000 + r() * 89999999)}`,
          githubUsername: m.name.split(" ")[0]!.toLowerCase() + m.matric.slice(-2),
          skills: Object.fromEntries(SKILL_AREAS.map((s) => [s.key, { rating: 1 + Math.floor(r() * 4), evidence: r() < 0.5 ? "TMA2013 assignment" : "" }])),
          resources: {
            laptopCanRunEmulator: r() < 0.8,
            laptopOs: pick(r, ["Windows", "macOS"]),
            laptopRamGb: pick(r, [8, 16]),
            androidVersion: r() < 0.7 ? "14" : "",
            iosVersion: "",
            noTestDevice: false,
            chatgpt: pick(r, ["Free", "Plus"]),
            claude: pick(r, ["None", "Free"]),
            otherAiTools: "",
          },
          experience: "Built a Flutter to-do app and a Laravel web system for a course project.",
          previousProjects: "TMA2013 group project (4 members): implemented the login and profile modules.",
          leadership: r() < 0.4 ? "Committee member, residential college sports club." : null,
          residence: pick(r, ["UNIMAS college", "Kota Samarahan", "Kuching"]),
          ownTransport: r() < 0.5,
          meetingAvailability: r() < 0.5 ? ["Weekday evenings", "Online only"] : ["Saturdays"],
          weeklyCommitments: grid,
          preferredMeetingSlot: "Thu 20:00–21:00",
          rolePreferences: {
            TEAM_LEADER: m.focus === "lead" ? 5 : 2,
            DEVELOPMENT_MANAGER: m.focus === "dev" ? 5 : 3,
            PLANNING_MANAGER: m.focus === "plan" ? 5 : 2,
            QUALITY_PROCESS_MANAGER: m.focus === "qa" ? 5 : 2,
            SUPPORT_MANAGER: m.focus === "support" ? 5 : 1,
          },
          declaredAt: at,
          submittedAt: at,
          createdAt: at,
          updatedAt: at,
          ...audit,
        },
      });
    }
  }
  return { currentWeek, today: formatDateOnly(today) };
}
