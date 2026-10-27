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

/** Fields whose change means the reviewer must look again (approval is withdrawn). */
export const AI_LOG_REVIEWED_FIELDS = [
  "module",
  "tool",
  "model",
  "promptSpec",
  "outputSummary",
  "humanRefinement",
  "testEvidence",
  "prUrl",
] as const;
