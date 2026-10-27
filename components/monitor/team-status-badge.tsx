import type { TeamStatus } from "@/lib/monitoring/status";
import { STATUS_LABEL } from "@/lib/monitoring/status";
import { Badge } from "@/components/ui/card";

const TONE: Record<TeamStatus, "green" | "amber" | "red"> = { ON_TRACK: "green", AT_RISK: "amber", BEHIND: "red" };
const ICON: Record<TeamStatus, string> = { ON_TRACK: "●", AT_RISK: "▲", BEHIND: "■" };

/** Team status with an icon and a label (never colour alone). */
export function TeamStatusBadge({ status, reasons }: { status: TeamStatus; reasons?: string[] }) {
  return (
    <span title={reasons?.join("\n")}>
      <Badge tone={TONE[status]}>
        <span aria-hidden className="mr-1">
          {ICON[status]}
        </span>
        {STATUS_LABEL[status]}
      </Badge>
    </span>
  );
}
