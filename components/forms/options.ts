import type { Phase } from "@/generated/prisma/enums";
import { PHASES } from "@/lib/tsp/phases";
import { formatDateOnly, localDate } from "@/lib/tsp/calendar";
import type { Option } from "./log-table";

/** Phase pick list: hidden phases are left out, except the value already on the row being edited. */
export function phaseOptions(allowed: (p: (typeof PHASES)[number]) => boolean, hidden: readonly Phase[]): Option[] {
  return PHASES.filter((p) => allowed(p) && !hidden.includes(p.code)).map((p) => ({ value: p.code, label: `${p.code} – ${p.name}` }));
}

export function withCurrent(options: Option[], current: string | null | undefined, label?: string): Option[] {
  if (!current || options.some((o) => o.value === current)) return options;
  return [...options, { value: current, label: label ?? current }];
}

export const none = (label = "—"): Option => ({ value: "", label });

export function todayString(): string {
  return formatDateOnly(localDate(new Date()));
}
