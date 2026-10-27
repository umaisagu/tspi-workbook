import { z } from "zod";
import { phaseSchema, tspiRoleSchema } from "./admin";
import { parseClock, timeEntryErrors } from "@/lib/tsp/time";
import { defectPhaseErrors, isDefectType } from "@/lib/tsp/defects";
import { PHASES } from "@/lib/tsp/phases";
import {
  CHATGPT_PLANS,
  CLAUDE_PLANS,
  COMMITMENT_CODES,
  COMMITMENT_DAYS,
  COMMITMENT_SLOTS,
  LAPTOP_OS,
  MEETING_AVAILABILITY,
  RESIDENCE_OPTIONS,
  SKILL_AREAS,
} from "@/lib/tsp/student-info";

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
  }, "Enter a valid date");

const clock = (label: string) =>
  z.string().refine((v) => parseClock(v) !== null, `Enter the ${label} time as HH:MM (24-hour)`);

const optionalId = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const requiredText = (label: string, max: number) => z.string().trim().min(1, `Enter ${label}`).max(max);

const intField = (label: string, min: number, max: number) =>
  z.coerce.number({ error: `Enter ${label}` }).int(`${label} must be a whole number`).min(min).max(max);

// ---------- LOGT ----------

export const timeLogSchema = z
  .object({
    date: dateOnlySchema,
    start: clock("start"),
    stop: clock("stop"),
    interruptMin: intField("interruption minutes", 0, 1440).default(0),
    phase: phaseSchema,
    componentId: optionalId,
    taskId: optionalId,
    comments: optionalText(500),
  })
  .superRefine((v, ctx) => {
    if (!PHASES.find((p) => p.code === v.phase)?.logTime) {
      ctx.addIssue({ code: "custom", path: ["phase"], message: "Time is not logged in this phase" });
    }
    const errors = timeEntryErrors({ startMin: parseClock(v.start)!, stopMin: parseClock(v.stop)!, interruptMin: v.interruptMin });
    for (const [field, message] of Object.entries(errors)) ctx.addIssue({ code: "custom", path: [field], message });
  });
export type TimeLogInput = z.infer<typeof timeLogSchema>;

// ---------- LOGD ----------

export const defectLogSchema = z
  .object({
    date: dateOnlySchema,
    type: z.coerce.number().refine(isDefectType, "Choose a defect type"),
    componentId: optionalId,
    phaseInjected: phaseSchema,
    phaseRemoved: phaseSchema,
    fixTimeMin: intField("fix time in minutes", 0, 10000),
    fixRefId: optionalId,
    description: requiredText("a description", 1000),
  })
  .superRefine((v, ctx) => {
    for (const [field, message] of Object.entries(defectPhaseErrors(v.phaseInjected, v.phaseRemoved))) {
      ctx.addIssue({ code: "custom", path: [field], message });
    }
  });
export type DefectLogInput = z.infer<typeof defectLogSchema>;

// ---------- LOGAI ----------

export const aiLogSchema = z.object({
  date: dateOnlySchema,
  module: requiredText("the module or requirement ID", 200),
  tool: requiredText("the tool (e.g. Claude, Codex)", 100),
  model: requiredText("the exact model", 100),
  promptSpec: requiredText("the prompt or spec", 5000),
  outputSummary: requiredText("a summary of the output", 3000),
  humanRefinement: requiredText("what you changed, corrected or rejected", 3000),
  testEvidence: requiredText("the test evidence", 2000),
  prUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(v), "Use a GitHub pull request link"),
  reviewerMembershipId: optionalId,
});
export type AiLogInput = z.infer<typeof aiLogSchema>;

export const aiReviewSchema = z.object({ approved: z.boolean() });

// ---------- FORM-SI ----------

const rating = z.coerce.number().int().min(1, "Rate 1–5").max(5, "Rate 1–5");

export const skillsSchema = z.object(
  Object.fromEntries(
    SKILL_AREAS.map((s) => [s.key, z.object({ rating, evidence: z.string().trim().max(300).default("") })]),
  ) as Record<(typeof SKILL_AREAS)[number]["key"], z.ZodObject<{ rating: typeof rating; evidence: z.ZodDefault<z.ZodString> }>>,
);

export const resourcesSchema = z.object({
  laptopCanRunEmulator: z.boolean(),
  laptopOs: z.enum(LAPTOP_OS).nullable().default(null),
  laptopRamGb: z.coerce.number().int().min(0).max(512).nullable().default(null),
  androidVersion: z.string().trim().max(30).default(""),
  iosVersion: z.string().trim().max(30).default(""),
  noTestDevice: z.boolean().default(false),
  chatgpt: z.enum(CHATGPT_PLANS).default("None"),
  claude: z.enum(CLAUDE_PLANS).default("None"),
  otherAiTools: z.string().trim().max(200).default(""),
});

const commitmentCell = z.enum(COMMITMENT_CODES).or(z.literal("")).default("");
export const weeklyCommitmentsSchema = z.object(
  Object.fromEntries(
    COMMITMENT_SLOTS.map((slot) => [slot, z.object(Object.fromEntries(COMMITMENT_DAYS.map((d) => [d, commitmentCell])))]),
  ),
);

/** Zod 4 records with enum keys are exhaustive: every role must be ranked (an error per missing role). */
export const rolePreferencesSchema = z.record(tspiRoleSchema, rating);

const githubUsername = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/, "Enter your GitHub username (letters, numbers, single hyphens)");

export const studentInfoSchema = z
  .object({
    // A
    fullName: requiredText("your full name", 120),
    matricNo: z.string().trim().regex(/^[A-Za-z0-9-]{3,20}$/, "Enter your matric number"),
    date: dateOnlySchema,
    programme: requiredText("your programme / major", 120),
    yearOfStudy: intField("year of study", 1, 7),
    creditsRegistered: intField("credits registered", 0, 40),
    expectedGradSemester: z.coerce.number().int().min(1).max(3).nullable().default(null),
    expectedGradYear: z.coerce.number().int().min(2024).max(2040).nullable().default(null),
    phone: optionalText(30),
    githubUsername,
    // B, C
    skills: skillsSchema,
    resources: resourcesSchema,
    // D-F
    experience: optionalText(3000),
    previousProjects: optionalText(3000),
    leadership: optionalText(3000),
    // G
    clientContact: optionalText(300),
    appIdea: optionalText(1000),
    aiFeatureIdea: optionalText(1000),
    // H
    preferredTeammates: optionalText(300),
    residence: z.enum(RESIDENCE_OPTIONS),
    residenceOther: optionalText(100),
    ownTransport: z.boolean(),
    meetingAvailability: z.array(z.enum(MEETING_AVAILABILITY)).min(1, "Choose at least one"),
    // I
    weeklyCommitments: weeklyCommitmentsSchema,
    commitmentNotes: optionalText(500),
    preferredMeetingSlot: optionalText(100),
    // J
    rolePreferences: rolePreferencesSchema,
    // K
    declared: z.literal(true, { error: "Tick the declaration to submit" }),
  })
  .superRefine((v, ctx) => {
    if (v.residence === "Other" && !v.residenceOther) {
      ctx.addIssue({ code: "custom", path: ["residenceOther"], message: "Say where you stay" });
    }
  });
export type StudentInfoInput = z.infer<typeof studentInfoSchema>;

// ---------- Components and comments ----------

export const componentSchema = z.object({
  name: requiredText("a component name", 80),
  kind: z.enum(["ASSEMBLY", "PART"]).default("ASSEMBLY"),
  parentId: optionalId,
  ownerMembershipId: optionalId,
});

export const commentSchema = z.object({
  formType: z.enum(["SI", "LOGT", "LOGD", "LOGAI", "PEER", "TASK", "SCHEDULE", "LOGTEST", "WEEK", "SUMS", "SUMP", "SUMQ", "SUMTASK", "CCR"]),
  membershipId: optionalId,
  recordId: optionalId,
  body: requiredText("a comment", 2000),
});
