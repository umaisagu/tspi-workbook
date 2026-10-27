/** FORM-SI structure, following docs/TSP_Student_Information_Sheet.md. */

/** Section B: technical self-assessment (1 = never used, 3 = used in a course assignment, 5 = built a working product). */
export const SKILL_AREAS = [
  { key: "flutter", label: "Dart and Flutter mobile development" },
  { key: "oop", label: "Object-oriented programming (any language)" },
  { key: "git", label: "Git and GitHub (branches, pull requests, code review)" },
  { key: "uiux", label: "UI/UX design (Material 3, Figma, wireframes)" },
  { key: "backend", label: "Backend / database (Firebase, Supabase, REST, SQL)" },
  { key: "testing", label: "Software testing (unit, widget, integration tests)" },
  { key: "cicd", label: "CI/CD (GitHub Actions) and build/release" },
  { key: "ai", label: "AI API integration or prompting (Gemini, Claude, OpenAI, ML Kit)" },
  { key: "docs", label: "Requirements and design documentation (SRS, SDS, UML/ERD)" },
  { key: "planning", label: "Planning and time tracking (PSP/TSPi, Agile/Scrum)" },
] as const;
export type SkillKey = (typeof SKILL_AREAS)[number]["key"];

/** Section H. */
export const RESIDENCE_OPTIONS = ["UNIMAS college", "Kota Samarahan", "Kuching", "Other"] as const;
export const MEETING_AVAILABILITY = ["Weekday evenings", "Saturdays", "Online only"] as const;

/** Section C. */
export const LAPTOP_OS = ["Windows", "macOS", "Linux"] as const;
export const CHATGPT_PLANS = ["None", "Free", "Plus"] as const;
export const CLAUDE_PLANS = ["None", "Free", "Pro"] as const;

/** Section I: weekly commitments grid. C = class, W = part-time work, A = club / sport / other activity. */
export const COMMITMENT_SLOTS = ["08-10", "10-12", "12-14", "14-16", "16-18", "18-20", "20-22"] as const;
export const COMMITMENT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const COMMITMENT_CODES = ["C", "W", "A"] as const;
/** The Wednesday 4–6 pm lab is fixed. */
export const LAB_SLOT = { slot: "16-18", day: "Wed" } as const;

export function slotLabel(slot: (typeof COMMITMENT_SLOTS)[number]): string {
  const [a, b] = slot.split("-");
  return `${a}:00 – ${b}:00`;
}

/** Free hours per week in the grid (2 hours per empty slot, excluding the lab). Used to suggest meeting slots. */
export function freeSlots(grid: Partial<Record<string, Partial<Record<string, string>>>>): string[] {
  const free: string[] = [];
  for (const day of COMMITMENT_DAYS) {
    for (const slot of COMMITMENT_SLOTS) {
      if (day === LAB_SLOT.day && slot === LAB_SLOT.slot) continue;
      if (!grid[slot]?.[day]) free.push(`${day} ${slot}`);
    }
  }
  return free;
}
