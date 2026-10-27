/**
 * Form completion per milestone (milestone view, dashboards, "missing forms" flag in Stage 6).
 *
 *  - complete: done on time; late: done, but only after the deadline; missing: not done and past due;
 *    pending: not done, not yet due.
 *  - FORM-SI and PEER: submitted (time of first submission).
 *  - Log forms (LOGT, LOGD, LOGAI, LOGTEST): at least one entry dated on or before the deadline; if every such
 *    entry was typed in after the deadline, it is late.
 *  - TASK / SCHEDULE / SUMS: data existed by the deadline (SUMS: an actual size entered).
 *  - SUMP / SUMQ / SUMTASK are computed: complete when their inputs are (SUMS+LOGT, SUMS+LOGD, TASK+LOGT).
 *  - WEEK: every report due by the deadline submitted (late if any was late).
 */
import type { FormType } from "@/generated/prisma/enums";

export type CompletionStatus = "complete" | "late" | "missing" | "pending";

export const INDIVIDUAL_REQUIRED: readonly FormType[] = ["SI", "LOGT", "LOGD", "LOGAI", "PEER"];

export interface Entry {
  /** The date the entry is about (log date). */
  date: Date;
  createdAt: Date;
}

/** Status from a submission time. */
export function submittedStatus(submittedAt: Date | null | undefined, dueAt: Date, now: Date): CompletionStatus {
  if (submittedAt) return submittedAt <= dueAt ? "complete" : "late";
  return now > dueAt ? "missing" : "pending";
}

/** Status of a log form from its entries. */
export function entriesStatus(entries: readonly Entry[], dueAt: Date, now: Date): CompletionStatus {
  const relevant = entries.filter((e) => e.date <= dueAt);
  if (relevant.some((e) => e.createdAt <= dueAt)) return "complete";
  if (relevant.length > 0) return "late";
  return now > dueAt ? "missing" : "pending";
}

/** Worst of several statuses (missing > late > pending > complete). */
export function combine(statuses: readonly CompletionStatus[]): CompletionStatus {
  for (const s of ["missing", "late", "pending"] as const) if (statuses.includes(s)) return s;
  return "complete";
}

export interface MemberFormData {
  memberId: string;
  siSubmittedAt: Date | null;
  logt: readonly Entry[];
  logd: readonly Entry[];
  logai: readonly Entry[];
  /** PEER for this milestone: time the full set was submitted, or null. */
  peerSubmittedAt: Date | null;
}

export interface TeamFormData {
  /** createdAt of TASK rows */
  tasks: readonly Date[];
  /** createdAt of SCHEDULE rows */
  schedule: readonly Date[];
  logtest: readonly Entry[];
  /** updatedAt of components with an actual size entered */
  sums: readonly Date[];
  /** reports due by the milestone: due and submitted times */
  weekReports: readonly { week: number; dueAt: Date; submittedAt: Date | null }[];
  ccr: readonly Entry[];
}

export interface CompletionInput {
  dueAt: Date;
  requiredForms: readonly FormType[];
  peerRequired: boolean;
  now: Date;
  members: readonly MemberFormData[];
  team: TeamFormData;
}

export interface FormStatus {
  form: FormType;
  status: CompletionStatus;
}

const existed = (dates: readonly Date[], dueAt: Date, now: Date): CompletionStatus =>
  dates.some((d) => d <= dueAt) ? "complete" : dates.length > 0 ? "late" : now > dueAt ? "missing" : "pending";

export function milestoneCompletion(input: CompletionInput) {
  const { dueAt, now } = input;
  const required = new Set(input.requiredForms);
  if (!input.peerRequired) required.delete("PEER");

  const members = input.members.map((m) => {
    const forms: FormStatus[] = [];
    if (required.has("SI")) forms.push({ form: "SI", status: submittedStatus(m.siSubmittedAt, dueAt, now) });
    if (required.has("LOGT")) forms.push({ form: "LOGT", status: entriesStatus(m.logt, dueAt, now) });
    if (required.has("LOGD")) forms.push({ form: "LOGD", status: entriesStatus(m.logd, dueAt, now) });
    if (required.has("LOGAI")) forms.push({ form: "LOGAI", status: entriesStatus(m.logai, dueAt, now) });
    if (required.has("PEER")) forms.push({ form: "PEER", status: submittedStatus(m.peerSubmittedAt, dueAt, now) });
    return { memberId: m.memberId, forms };
  });

  const t = input.team;
  const sums = existed(t.sums, dueAt, now);
  const logtAll = combine(members.length ? input.members.map((m) => entriesStatus(m.logt, dueAt, now)) : ["missing"]);
  const logdAny = entriesStatus(input.members.flatMap((m) => m.logd), dueAt, now);
  const task = existed(t.tasks, dueAt, now);
  const teamForms: FormStatus[] = [];
  const add = (form: FormType, status: CompletionStatus) => required.has(form) && teamForms.push({ form, status });
  add("TASK", task);
  add("SCHEDULE", existed(t.schedule, dueAt, now));
  add("LOGTEST", entriesStatus(t.logtest, dueAt, now));
  add("SUMS", sums);
  add("SUMP", combine([sums, logtAll]));
  add("SUMQ", combine([sums, logdAny]));
  add("SUMTASK", combine([task, logtAll]));
  add(
    "WEEK",
    t.weekReports.length === 0
      ? "complete"
      : combine(t.weekReports.filter((r) => r.dueAt <= dueAt).map((r) => submittedStatus(r.submittedAt, r.dueAt, now))),
  );
  add("CCR", entriesStatus(t.ccr, dueAt, now));

  const items = [...teamForms, ...members.flatMap((m) => m.forms)];
  const done = items.filter((i) => i.status === "complete" || i.status === "late").length;
  return {
    team: teamForms,
    members,
    done,
    total: items.length,
    /** 0..1 */
    percent: items.length ? done / items.length : 1,
    status: combine(items.map((i) => i.status)),
  };
}
export type MilestoneCompletion = ReturnType<typeof milestoneCompletion>;
