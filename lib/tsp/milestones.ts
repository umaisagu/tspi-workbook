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
 * Defaults from docs/TMA3084_Lab_Outline.md (milestone weeks, submission at the Wednesday lab)
 * and docs/TMA3084_Group_Project_Assessment.md (final documentation due 2 Jan, 10.00pm).
 * Required forms per milestone are a default the lecturer can change; CCR is optional throughout.
 */
export const MILESTONE_DEFAULTS: readonly MilestoneDefault[] = [
  { code: "M1", title: "Scope & Requirements", week: 5, dueDayOffset: 2, dueHour: 23, dueMinute: 59, requiredForms: M1_FORMS },
  { code: "M2", title: "Design & Prototype", week: 9, dueDayOffset: 2, dueHour: 23, dueMinute: 59, requiredForms: M2_FORMS },
  { code: "M3", title: "Product & Verification", week: 13, dueDayOffset: 2, dueHour: 23, dueMinute: 59, requiredForms: M3_FORMS },
  { code: "M4", title: "Final Release & Acceptance", week: 15, dueDayOffset: 5, dueHour: 22, dueMinute: 0, requiredForms: M3_FORMS },
];

export function milestoneDueAt(m: MilestoneDefault, week1Monday: Date): Date {
  const monday = weekStart(m.week, week1Monday);
  const day = new Date(monday.getTime() + m.dueDayOffset * 24 * 60 * 60 * 1000);
  return myTime(day, m.dueHour, m.dueMinute);
}
