import "server-only";
import type { SiValues } from "@/components/forms/student-info-form";
import type { StoredStudentInfo } from "@/lib/server/forms/student-info";
import { formatDateOnly, localDate } from "@/lib/tsp/calendar";
import { COMMITMENT_DAYS, COMMITMENT_SLOTS, SKILL_AREAS } from "@/lib/tsp/student-info";
import { TSPI_ROLES } from "@/lib/tsp/roles";

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function record(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Form state for FORM-SI: the stored sheet, or sensible defaults for a new one. */
export function siFormValues(stored: StoredStudentInfo | null, user: { name: string; email: string }): SiValues {
  const skills = record(stored?.skills);
  const resources = record(stored?.resources);
  const grid = record(stored?.weeklyCommitments);
  const prefs = record(stored?.rolePreferences);
  const local = user.email.split("@")[0] ?? "";
  return {
    fullName: stored?.fullName ?? user.name,
    matricNo: stored?.matricNo ?? (/^\d+$/.test(local) ? local : ""),
    date: stored?.date ?? formatDateOnly(localDate(new Date())),
    programme: stored?.programme ?? "",
    yearOfStudy: str(stored?.yearOfStudy),
    creditsRegistered: str(stored?.creditsRegistered),
    expectedGradSemester: str(stored?.expectedGradSemester),
    expectedGradYear: str(stored?.expectedGradYear),
    phone: str(stored?.phone),
    githubUsername: stored?.githubUsername ?? "",
    skills: Object.fromEntries(
      SKILL_AREAS.map((s) => {
        const v = record(skills[s.key]);
        return [s.key, { rating: str(v.rating), evidence: str(v.evidence) }];
      }),
    ),
    resources: {
      laptopCanRunEmulator: resources.laptopCanRunEmulator === true,
      laptopOs: str(resources.laptopOs),
      laptopRamGb: str(resources.laptopRamGb),
      androidVersion: str(resources.androidVersion),
      iosVersion: str(resources.iosVersion),
      noTestDevice: resources.noTestDevice === true,
      chatgpt: str(resources.chatgpt) || "None",
      claude: str(resources.claude) || "None",
      otherAiTools: str(resources.otherAiTools),
    },
    experience: str(stored?.experience),
    previousProjects: str(stored?.previousProjects),
    leadership: str(stored?.leadership),
    clientContact: str(stored?.clientContact),
    appIdea: str(stored?.appIdea),
    aiFeatureIdea: str(stored?.aiFeatureIdea),
    preferredTeammates: str(stored?.preferredTeammates),
    residence: stored?.residence ?? "",
    residenceOther: stored?.residenceOther ?? "",
    ownTransport: stored?.ownTransport ?? false,
    meetingAvailability: stored?.meetingAvailability ?? [],
    weeklyCommitments: Object.fromEntries(
      COMMITMENT_SLOTS.map((slot) => [slot, Object.fromEntries(COMMITMENT_DAYS.map((d) => [d, str(record(grid[slot])[d])]))]),
    ),
    commitmentNotes: str(stored?.commitmentNotes),
    preferredMeetingSlot: str(stored?.preferredMeetingSlot),
    rolePreferences: Object.fromEntries(TSPI_ROLES.map((r) => [r.role, str(prefs[r.role])])),
    declared: stored?.declared ?? false,
  };
}
