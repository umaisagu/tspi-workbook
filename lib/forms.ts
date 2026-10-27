import type { FormType } from "@/generated/prisma/enums";

/** URL slugs and titles of the forms (pages appear stage by stage). */
export const FORM_INFO: Record<FormType, { slug: string; title: string; description: string; individual: boolean }> = {
  SI: { slug: "si", title: "FORM-SI · Student Information Sheet", description: "Background, skills, availability and TSPi role preferences", individual: true },
  LOGT: { slug: "logt", title: "LOGT · Time Recording Log", description: "Every work session: date, start, stop, interruptions, phase", individual: true },
  LOGD: { slug: "logd", title: "LOGD · Defect Recording Log", description: "Defects found and fixed, with phases and fix time", individual: true },
  LOGAI: { slug: "logai", title: "LOGAI · AI Usage Log", description: "Every AI-assisted change: spec, output, refinement, tests, PR", individual: true },
  PEER: { slug: "peer", title: "PEER · Peer Evaluation", description: "Self-rating and evaluation of each teammate per milestone", individual: true },
  TASK: { slug: "task", title: "TASK · Task Plan", description: "Tasks, plan hours and earned value", individual: false },
  SCHEDULE: { slug: "schedule", title: "SCHEDULE · Schedule Plan", description: "Weekly plan vs actual hours and earned value", individual: false },
  LOGTEST: { slug: "logtest", title: "LOGTEST · Test Log", description: "Test cases and results", individual: false },
  WEEK: { slug: "week", title: "WEEK · Weekly Status Report", description: "Hours, earned value, risks and next week's plan", individual: false },
  SUMS: { slug: "sums", title: "SUMS · Size Summary", description: "Plan vs actual size per component", individual: false },
  SUMP: { slug: "sump", title: "SUMP · Plan Summary", description: "Size, time and defects per phase", individual: false },
  SUMQ: { slug: "sumq", title: "SUMQ · Quality Summary", description: "Defect density, yields and quality ratios", individual: false },
  SUMTASK: { slug: "sumtask", title: "SUMTASK · Task Summary", description: "Task roll-up from TASK and LOGT", individual: false },
  CCR: { slug: "ccr", title: "CCR · Configuration Change Request", description: "Change requests (optional)", individual: false },
};

/** Forms whose pages exist so far. */
export const AVAILABLE_FORMS: FormType[] = ["SI", "LOGT", "LOGD", "LOGAI", "TASK", "SCHEDULE", "SUMTASK", "SUMS", "SUMP", "SUMQ"];

export function formFromSlug(slug: string): FormType | undefined {
  return (Object.keys(FORM_INFO) as FormType[]).find((f) => FORM_INFO[f].slug === slug);
}
