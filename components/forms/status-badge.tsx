import { Badge } from "@/components/ui/card";

const MAP: Record<string, { label: string; tone: "green" | "amber" | "red" | "slate" | "blue" }> = {
  submitted: { label: "Submitted", tone: "green" },
  complete: { label: "Complete", tone: "green" },
  late: { label: "Late", tone: "amber" },
  missing: { label: "Missing", tone: "red" },
  open: { label: "Due soon", tone: "blue" },
  pending: { label: "Not yet due", tone: "slate" },
};

/** Submission / completion status with a text label (never colour alone). */
export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
