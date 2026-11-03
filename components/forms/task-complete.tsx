"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TaskStatus } from "@/generated/prisma/enums";
import { Button, Input, sendJson } from "@/components/ui/form";
import { Badge } from "@/components/ui/card";
import { taskStatusLabel } from "@/lib/tsp/tasks";

/** Today in the course time zone (Asia/Kuching), as YYYY-MM-DD. */
function todayMyt(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuching", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const small = "min-h-8 whitespace-nowrap px-2 py-1 text-xs";

/** The assignee's control on a TASK row: start the task, mark it done on a date, or undo. */
export function TaskComplete({
  teamId,
  taskId,
  status,
  completedOn,
  taskName,
}: {
  teamId: string;
  taskId: string;
  status: TaskStatus;
  completedOn: string | null;
  taskName: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(todayMyt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function save(next: TaskStatus, value: string | null) {
    setPending(true);
    setError(undefined);
    const r = await sendJson(`/api/teams/${teamId}/tasks/${taskId}/complete`, "POST", { status: next, completedOn: value });
    setPending(false);
    if (!r.ok) setError(r.fields?.completedOn?.[0] ?? r.fields?.status?.[0] ?? r.error);
    else router.refresh();
  }
  let body: React.ReactNode;
  if (status === "CANCELLED" || status === "CARRIED_OVER") {
    body = <Badge>{taskStatusLabel(status)}</Badge>;
  } else if (status === "COMPLETE") {
    body = (
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <Badge tone="green">Complete</Badge>
        {completedOn}
        <Button type="button" variant="secondary" className={small} disabled={pending} onClick={() => save("IN_PROGRESS", null)} aria-label={`Mark "${taskName}" not done`}>
          Undo
        </Button>
      </span>
    );
  } else {
    body = (
      <span className="inline-flex flex-wrap items-center gap-2">
        <Badge tone={status === "IN_PROGRESS" ? "blue" : "slate"}>{taskStatusLabel(status)}</Badge>
        {status === "PLANNED" && (
          <Button type="button" variant="secondary" className={small} disabled={pending} onClick={() => save("IN_PROGRESS", null)} aria-label={`Start "${taskName}"`}>
            Start
          </Button>
        )}
        <Input type="date" value={date} max={todayMyt()} onChange={(e) => setDate(e.target.value)} className="w-36 py-1 text-xs" aria-label={`Completion date for "${taskName}"`} />
        <Button type="button" className={small} disabled={pending || !date} onClick={() => save("COMPLETE", date)}>
          Mark done
        </Button>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      {body}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
