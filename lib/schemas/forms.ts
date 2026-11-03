import { z } from "@/lib/schemas/zod";
import { phaseSchema, tspiRoleSchema } from "./admin";
import { parseClock, timeEntryErrors } from "@/lib/tsp/time";
import { defectPhaseErrors, isDefectType } from "@/lib/tsp/defects";
import { PHASES } from "@/lib/tsp/phases";
import { estimatedHours } from "@/lib/tsp/earned-value";
import { taskStatusErrors } from "@/lib/tsp/tasks";
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

/** A Yes/No select (Workbook v3.0 drop-downs) stored as a boolean. */
const yesNo = z
  .union([z.boolean(), z.enum(["yes", "no", ""]), z.null()])
  .optional()
  .transform((v) => v === true || v === "yes");

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
    aiUsed: yesNo,
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
    severity: z.enum(["CRITICAL", "MAJOR", "MINOR", "COSMETIC"]).default("MINOR"),
    fromAi: yesNo,
    fixReference: optionalText(200),
    description: requiredText("a description", 1000),
  })
  .superRefine((v, ctx) => {
    for (const [field, message] of Object.entries(defectPhaseErrors(v.phaseInjected, v.phaseRemoved))) {
      ctx.addIssue({ code: "custom", path: [field], message });
    }
  });
export type DefectLogInput = z.infer<typeof defectLogSchema>;

// ---------- LOGAI ----------

/** LOGAI (Workbook v3.0): one row per AI-assisted change that reached the repository. */
export const aiLogSchema = z
  .object({
    date: dateOnlySchema,
    module: requiredText("the file or module", 200),
    feature: requiredText("the feature or behaviour", 300),
    tool: requiredText("the AI tool", 100),
    promptSpec: requiredText("the prompt (summarised)", 2000),
    linesGenerated: intField("the lines generated", 0, 100000),
    linesKept: intField("the lines kept after review", 0, 100000),
    testsWritten: yesNo,
    testStatus: z.enum(["PASS", "FAIL", "NOT_RUN"]).default("NOT_RUN"),
    commitRef: optionalText(200),
    reviewerMembershipId: optionalId,
  })
  .superRefine((v, ctx) => {
    if (v.linesKept > v.linesGenerated) ctx.addIssue({ code: "custom", path: ["linesKept"], message: "Cannot keep more lines than were generated" });
  });
export type AiLogInput = z.infer<typeof aiLogSchema>;

/** The reviewer's verdict on a LOGAI entry. */
export const aiReviewSchema = z.object({ verdict: z.enum(["APPROVED", "APPROVED_WITH_CHANGES", "CHANGES_REQUESTED", "REJECTED", "PENDING"]) });

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

// ---------- TASK ----------

const optionalNumber = (label: string, min: number, max: number) =>
  z
    .union([z.literal(""), z.null(), z.undefined(), z.coerce.number({ error: `Enter ${label} as a number` }).min(min, `${label} must be at least ${min}`).max(max)])
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : v));

export const sizeMeasureSchema = z.enum(["TEXT_PAGES", "REQ_PAGES", "HLD_PAGES", "DLD_LINES", "LOC"]);

export const taskStatusSchema = z.enum(["PLANNED", "IN_PROGRESS", "COMPLETE", "CARRIED_OVER", "CANCELLED"]);

const optionalCompletedOn = z
  .union([dateOnlySchema, z.literal(""), z.null(), z.undefined()])
  .optional()
  .transform((v) => (v ? v : null));

/**
 * A TASK row (Workbook v3.0). Plan hours are entered, or left empty to use the estimate size / rate. Task ID is
 * typed or left empty for the next T-number; plan week is typed or left empty to take it from SCHEDULE.
 * Plan value, actual hours and earned value are always computed; Complete needs the completion date.
 */
export const taskSchema = z
  .object({
    order: optionalNumber("the order", 0, 100000),
    code: z
      .string()
      .trim()
      .max(12)
      .regex(/^[A-Za-z0-9-]*$/, "Use letters, digits and - only, e.g. T07")
      .optional()
      .nullable()
      .transform((v) => (v ? v.toUpperCase() : null)),
    milestoneId: optionalId,
    status: taskStatusSchema.default("PLANNED"),
    planWeek: optionalNumber("the plan week", 1, 30).refine((v) => v === null || Number.isInteger(v), "Enter a week number"),
    name: requiredText("the task name", 200),
    phase: phaseSchema,
    componentId: optionalId,
    assigneeMembershipId: optionalId,
    planHours: optionalNumber("plan hours", 0, 1000),
    estSize: optionalNumber("the estimated size", 0, 1000000),
    sizeMeasure: z
      .union([sizeMeasureSchema, z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((v) => (v ? v : null)),
    rate: optionalNumber("the rate", 0, 100000),
    completedOn: optionalCompletedOn,
  })
  .superRefine((v, ctx) => {
    for (const [field, message] of Object.entries(taskStatusErrors(v.status, v.completedOn))) ctx.addIssue({ code: "custom", path: [field], message });
    if (v.planHours === null && estimatedHours(v.estSize, v.rate) === null) {
      ctx.addIssue({ code: "custom", path: ["planHours"], message: "Enter plan hours, or a size and rate to estimate them" });
    }
    if (v.estSize !== null && !v.sizeMeasure) ctx.addIssue({ code: "custom", path: ["sizeMeasure"], message: "Choose the size measure" });
  })
  .transform((v) => ({ ...v, planHours: v.planHours ?? estimatedHours(v.estSize, v.rate) ?? 0 }));
export type TaskInput = z.output<typeof taskSchema>;

/** The assigned member sets their task's status: Planned, In progress, or Complete with the completion date. */
export const taskCompletionSchema = z
  .object({ status: taskStatusSchema.optional(), completedOn: optionalCompletedOn })
  .transform((v) => ({ completedOn: v.completedOn, status: v.status ?? (v.completedOn ? ("COMPLETE" as const) : ("IN_PROGRESS" as const)) }))
  .superRefine((v, ctx) => {
    for (const [field, message] of Object.entries(taskStatusErrors(v.status, v.completedOn))) ctx.addIssue({ code: "custom", path: [field], message });
  });

// ---------- SCHEDULE ----------

export const scheduleRowSchema = z.object({
  membershipId: z.string().min(1),
  weeks: z
    .array(z.object({ week: z.coerce.number().int().min(1).max(30), planHours: z.coerce.number().min(0, "Hours cannot be negative").max(80, "At most 80 hours a week") }))
    .max(30),
});

// ---------- SUMS sizes and SUMQ plan ----------

const sizeCount = (label: string) => z.coerce.number({ error: `Enter ${label}` }).int(`${label} must be a whole number`).min(0, `${label} cannot be negative`).max(10_000_000);
/** SUMS: plan and actual Base, Deleted, Modified, Added, Reused and New Reuse are entered (as in the workbook). */
export const componentSizeSchema = z.object({
  sizeMeasure: sizeMeasureSchema,
  planBase: sizeCount("base"),
  planDeleted: sizeCount("deleted"),
  planModified: sizeCount("modified"),
  planAdded: sizeCount("added"),
  planReused: sizeCount("reused"),
  planNewReuse: sizeCount("new reuse"),
  actBase: sizeCount("base"),
  actDeleted: sizeCount("deleted"),
  actModified: sizeCount("modified"),
  actAdded: sizeCount("added"),
  actReused: sizeCount("reused"),
  actNewReuse: sizeCount("new reuse"),
});
export type ComponentSizeInput = z.infer<typeof componentSizeSchema>;

const optionalRate = z
  .union([z.literal(""), z.null(), z.coerce.number().min(0, "Cannot be negative").max(100)])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? null : v));

/** SUMQ plan inputs per phase: defects injected per hour, and phase yield (0–1). */
export const qualityPlanSchema = z.object({
  reset: z.boolean().optional(),
  rows: z
    .array(
      z.object({
        phase: phaseSchema,
        planInjectionRate: optionalRate,
        planYield: optionalRate.refine((v) => v === null || v <= 1, "Yield is a fraction between 0 and 1"),
      }),
    )
    .max(30)
    .default([]),
});

// ---------- LOGTEST ----------

export const testLogSchema = z.object({
  /** Left empty, the next TC-nnn is assigned. */
  testCode: z
    .string()
    .trim()
    .max(30)
    .regex(/^[A-Za-z0-9._-]*$/, "Use letters, numbers, dots, dashes or underscores")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  module: requiredText("the module or requirement ID", 200),
  description: requiredText("what the test checks", 1000),
  type: z.enum(["UNIT", "WIDGET", "INTEGRATION", "MANUAL", "ACCEPTANCE", "REGRESSION", "PERFORMANCE", "SECURITY"]),
  expected: requiredText("the expected result", 1000),
  actual: optionalText(1000),
  status: z.enum(["PASS", "FAIL", "BLOCKED", "NOT_RUN"]).default("NOT_RUN"),
  date: dateOnlySchema,
  automated: yesNo,
  defectRef: optionalText(40),
  /** Team Leader only: record a test for another member. */
  authorMembershipId: optionalId,
});
export type TestLogInput = z.infer<typeof testLogSchema>;

// ---------- WEEK ----------

export const weeklyReportSchema = z.object({
  tasksCompleted: optionalText(3000),
  risksIssues: optionalText(3000),
  nextWeekPlan: optionalText(3000),
  submit: z.boolean().default(false),
});

// ---------- PEER ----------

const peerScore = z.coerce.number({ error: "Rate 1–5" }).int().min(1, "Rate 1–5").max(5, "Rate 1–5");
export const peerEvaluationSchema = z.object({
  milestoneId: z.string().min(1),
  submit: z.boolean().default(false),
  ratings: z
    .array(
      z.object({
        evaluateeId: z.string().min(1),
        scores: z.object({
          quantity: peerScore,
          timeliness: peerScore,
          taskSupport: peerScore,
          interaction: peerScore,
          attendance: peerScore,
          responsibility: peerScore,
          involvement: peerScore,
          leadership: peerScore,
          roleAssignment: peerScore,
          overall: peerScore,
        }),
        comment: optionalText(1000),
      }),
    )
    .min(1)
    .max(6),
});

// ---------- CCR ----------

export const changeRequestSchema = z.object({
  date: dateOnlySchema,
  componentId: optionalId,
  description: requiredText("the change", 2000),
  reason: requiredText("the reason for the change", 2000),
  impact: optionalText(2000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  status: z.enum(["SUBMITTED", "APPROVED", "REJECTED", "IMPLEMENTED"]).default("SUBMITTED"),
});
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>;

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

// ---------- Monitoring ----------

export const flagReviewSchema = z.object({
  membershipId: z.string().min(1),
  type: z.enum(["LOW_SHARE", "INACTIVE", "HOURS_NO_OUTPUT", "BACKFILL", "PEER_MISMATCH", "MISSING_FORMS"]),
  periodKey: z.string().min(1).max(40),
  status: z.enum(["OPEN", "REVIEWED", "DISMISSED"]),
  reason: optionalText(1000),
}).refine((v) => v.status !== "DISMISSED" || !!v.reason, { path: ["reason"], message: "Give a reason for dismissing the flag" });

export const noteSchema = z
  .object({ teamId: optionalId, membershipId: optionalId, body: requiredText("the note", 4000) })
  .refine((v) => !!v.teamId !== !!v.membershipId, { path: ["body"], message: "A note is about a team or a member" });
