import { z } from "@/lib/schemas/zod";
import { emailSchema } from "./auth";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Enter a valid date");

export const formTypeSchema = z.enum([
  "SI", "LOGT", "LOGD", "LOGAI", "PEER", "TASK", "SCHEDULE", "LOGTEST", "WEEK", "SUMS", "SUMP", "SUMQ", "SUMTASK", "CCR",
]);
export const phaseSchema = z.enum([
  "MGMT", "STRAT", "PLAN", "REQ", "STP", "REQINSP", "HLD", "ITP", "HLDINSP", "DLD", "DLDR", "TD", "DLDINSP",
  "CODE", "CR", "COMPILE", "CODEINSP", "UT", "IT", "ST", "DOC", "PM", "AT", "PL",
]);
export const tspiRoleSchema = z.enum([
  "TEAM_LEADER", "DEVELOPMENT_MANAGER", "PLANNING_MANAGER", "QUALITY_PROCESS_MANAGER", "SUPPORT_MANAGER",
]);
export const appRoleSchema = z.enum(["LECTURER", "DEMONSTRATOR", "STUDENT"]);

export const semesterCreateSchema = z.object({
  name: z.string().trim().min(3, "Enter a name, e.g. Sem 1 2026/2027").max(80),
  week1Monday: dateOnly.refine((v) => new Date(`${v}T00:00:00Z`).getUTCDay() === 1, "Week 1 must start on a Monday"),
  weekCount: z.coerce.number().int().min(1).max(30).default(15),
  breakWeeks: z.array(z.coerce.number().int().min(1).max(30)).default([]),
});

export const semesterUpdateSchema = semesterCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
  hiddenPhases: z.array(phaseSchema).optional(),
});

export const milestoneUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  week: z.coerce.number().int().min(1).max(30).optional(),
  /** ISO date-time */
  dueAt: z.iso.datetime({ offset: true }).optional(),
  requiredForms: z.array(formTypeSchema).optional(),
  peerRequired: z.boolean().optional(),
});

export const labGroupCreateSchema = z.object({
  semesterId: z.string().min(1),
  name: z.string().trim().min(1, "Enter a name").max(80),
  schedule: z.string().trim().max(120).optional(),
});
export const labGroupUpdateSchema = labGroupCreateSchema.omit({ semesterId: true }).partial();

export const addByEmailSchema = z.object({ email: emailSchema });

const repoUrl = z
  .string()
  .trim()
  .regex(/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/?$/, "Use a GitHub URL like https://github.com/owner/repo");

export const teamCreateSchema = z.object({
  labGroupId: z.string().min(1),
  name: z.string().trim().min(1, "Enter a team name").max(80),
  projectTitle: z.string().trim().max(160).optional(),
  clientName: z.string().trim().max(160).optional(),
  repoUrl: repoUrl.optional().or(z.literal("")),
});
export const teamUpdateSchema = teamCreateSchema.partial();

export const setRolesSchema = z.object({ roles: z.array(tspiRoleSchema).max(5) });

export const userUpdateSchema = z.object({
  appRole: appRoleSchema.optional(),
  isActive: z.boolean().optional(),
});
