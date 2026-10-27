/** LOGTEST: test IDs TC-001, TC-002, … per team (never reused). */
export function nextTestCode(existing: readonly string[]): string {
  const max = existing.reduce((m, c) => Math.max(m, Number(/^TC-(\d+)$/.exec(c)?.[1] ?? 0)), 0);
  return `TC-${String(max + 1).padStart(3, "0")}`;
}

/** Share of executed tests that pass, and counts by status. */
export function testSummary(rows: readonly { status: string; type: string }[]) {
  const by = (k: "status" | "type", v: string) => rows.filter((r) => r[k] === v).length;
  const executed = rows.length - by("status", "NOT_RUN");
  return {
    total: rows.length,
    pass: by("status", "PASS"),
    fail: by("status", "FAIL"),
    blocked: by("status", "BLOCKED"),
    notRun: by("status", "NOT_RUN"),
    unit: by("type", "UNIT"),
    widget: by("type", "WIDGET"),
    integration: by("type", "INTEGRATION"),
    passRate: executed > 0 ? by("status", "PASS") / executed : null,
  };
}
