import type { FormType } from "@/generated/prisma/enums";
import { myTime, weekStart } from "./calendar";

export interface MilestoneDefault {
  code: string;
  title: string;
  week: number;
  /** Day offset from the week's Monday, and local (UTC+8) time of the deadline. */
  dueDayOffset: number;
  dueHour: number;
  dueMinute: number;
  requiredForms: FormType[];
}

const M1_FORMS: FormType[] = ["SI", "TASK", "SCHEDULE"];
const M2_FORMS: FormType[] = [...M1_FORMS, "LOGT", "LOGD", "LOGAI", "WEEK", "PEER"];
const M3_FORMS: FormType[] = [...M2_FORMS, "LOGTEST", "SUMS", "SUMP", "SUMQ", "SUMTASK"];

/**
 * Milestone plan from Workbook v3.0 (SETUP): M1 Sun 25 Oct, M2 Fri 20 Nov, M3 Sun 20 Dec 2026 (23:59 MYT; v3.0 gives
 * dates only), M4 Sat 2 Jan 2027 at 10.00pm (docs/TMA3084_Group_Project_Assessment.md). Required forms per milestone
 * are a default the lecturer can change; CCR is optional throughout.
 */
export const MILESTONE_DEFAULTS: readonly MilestoneDefault[] = [
  { code: "M1", title: "Proposal & Planning", week: 5, dueDayOffset: 6, dueHour: 23, dueMinute: 59, requiredForms: M1_FORMS },
  { code: "M2", title: "Requirements & Design", week: 9, dueDayOffset: 4, dueHour: 23, dueMinute: 59, requiredForms: M2_FORMS },
  { code: "M3", title: "Implementation & Testing", week: 13, dueDayOffset: 6, dueHour: 23, dueMinute: 59, requiredForms: M3_FORMS },
  { code: "M4", title: "Release & Oral Commitment", week: 15, dueDayOffset: 5, dueHour: 22, dueMinute: 0, requiredForms: M3_FORMS },
];

export function milestoneDueAt(m: MilestoneDefault, week1Monday: Date): Date {
  const monday = weekStart(m.week, week1Monday);
  const day = new Date(monday.getTime() + m.dueDayOffset * 24 * 60 * 60 * 1000);
  return myTime(day, m.dueHour, m.dueMinute);
}
