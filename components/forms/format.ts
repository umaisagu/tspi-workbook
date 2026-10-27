/** Display helpers for computed values: null (zero denominator) shows as "—". */
export function num(v: number | null | undefined, dp = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return (Math.round(v * 10 ** dp) / 10 ** dp).toLocaleString("en-MY", { maximumFractionDigits: dp });
}

export function pct(v: number | null | undefined, dp = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${(v * 100).toFixed(dp)}%`;
}
