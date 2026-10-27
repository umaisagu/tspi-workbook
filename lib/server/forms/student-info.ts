import "server-only";
import { db } from "@/lib/db";
import type { StudentInfoInput } from "@/lib/schemas/forms";
import { formatDateOnly } from "@/lib/tsp/calendar";
import { RESIDENCE_OPTIONS } from "@/lib/tsp/student-info";

/** Residence is stored as one of the options, or "Other: <place>". */
export function splitResidence(stored: string | null): { residence: string; residenceOther: string } {
  if (!stored) return { residence: "", residenceOther: "" };
  if (stored.startsWith("Other:")) return { residence: "Other", residenceOther: stored.slice(6).trim() };
  return (RESIDENCE_OPTIONS as readonly string[]).includes(stored)
    ? { residence: stored, residenceOther: "" }
    : { residence: "Other", residenceOther: stored };
}

export function joinResidence(input: Pick<StudentInfoInput, "residence" | "residenceOther">): string {
  return input.residence === "Other" ? `Other: ${input.residenceOther ?? ""}` : input.residence;
}

/** FORM-SI as stored, shaped like the form's input (or null when not started). */
export async function loadStudentInfo(membershipId: string) {
  const si = await db.studentInfo.findUnique({ where: { membershipId } });
  if (!si) return null;
  return {
    fullName: si.fullName,
    matricNo: si.matricNo,
    date: formatDateOnly(si.date),
    programme: si.programme,
    yearOfStudy: si.yearOfStudy,
    creditsRegistered: si.creditsRegistered,
    expectedGradSemester: si.expectedGradSemester,
    expectedGradYear: si.expectedGradYear,
    phone: si.phone,
    githubUsername: si.githubUsername ?? "",
    skills: si.skills,
    resources: si.resources,
    experience: si.experience,
    previousProjects: si.previousProjects,
    leadership: si.leadership,
    clientContact: si.clientContact,
    appIdea: si.appIdea,
    aiFeatureIdea: si.aiFeatureIdea,
    preferredTeammates: si.preferredTeammates,
    ...splitResidence(si.residence),
    ownTransport: si.ownTransport ?? false,
    meetingAvailability: si.meetingAvailability,
    weeklyCommitments: si.weeklyCommitments,
    commitmentNotes: si.commitmentNotes,
    preferredMeetingSlot: si.preferredMeetingSlot,
    rolePreferences: si.rolePreferences,
    declared: si.declaredAt !== null,
    submittedAt: si.submittedAt?.toISOString() ?? null,
    updatedAt: si.updatedAt.toISOString(),
  };
}
export type StoredStudentInfo = NonNullable<Awaited<ReturnType<typeof loadStudentInfo>>>;
