/** LOGAI entry IDs: AI-001, AI-002, … numbered per student (docs/TMA3084_Lab_Outline.md, Vibe Coding Task 4). */
export function formatAiCode(n: number): string {
  return `AI-${String(n).padStart(3, "0")}`;
}

export function parseAiCode(code: string): number | null {
  const m = /^AI-(\d{3,})$/.exec(code);
  return m ? Number(m[1]) : null;
}

export function nextAiCode(existing: readonly string[]): string {
  const max = existing.reduce((acc, c) => Math.max(acc, parseAiCode(c) ?? 0), 0);
  return formatAiCode(max + 1);
}

/** Fields whose change means the reviewer must look again (the verdict goes back to Pending). */
export const AI_LOG_REVIEWED_FIELDS = [
  "module",
  "feature",
  "tool",
  "promptSpec",
  "linesGenerated",
  "linesKept",
  "testsWritten",
  "testStatus",
  "commitRef",
] as const;

/** Workbook v3.0 AI tool list (LISTS AI Tool). */
export const AI_TOOLS = ["GitHub Copilot", "Claude", "ChatGPT / GPT-4", "Google Gemini", "Cursor", "Other", "None"] as const;

export type AiVerdict = "APPROVED" | "APPROVED_WITH_CHANGES" | "CHANGES_REQUESTED" | "REJECTED" | "PENDING";

/** Workbook v3.0 review verdicts; the first two count as approved. */
export const AI_VERDICTS: readonly { value: AiVerdict; label: string }[] = [
  { value: "APPROVED", label: "Approved" },
  { value: "APPROVED_WITH_CHANGES", label: "Approved with changes" },
  { value: "CHANGES_REQUESTED", label: "Changes requested" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PENDING", label: "Pending" },
];

export function isApprovedVerdict(v: AiVerdict): boolean {
  return v === "APPROVED" || v === "APPROVED_WITH_CHANGES";
}

export function verdictLabel(v: AiVerdict): string {
  return AI_VERDICTS.find((x) => x.value === v)?.label ?? v;
}

/** Keep % = lines kept / lines generated (LOGAI J); null when nothing was generated. */
export function keepRate(generated: number | null, kept: number | null): number | null {
  return generated ? (kept ?? 0) / generated : null;
}
