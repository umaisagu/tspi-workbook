"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, sendJson } from "@/components/ui/form";

/** Today in the course time zone (Asia/Kuching), as YYYY-MM-DD. */
function todayMyt(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuching", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** The assignee's control on a TASK row: mark done on a date, or undo. */
export function TaskComplete({ teamId, taskId, completedOn, taskName }: { teamId: string; taskId: string; completedOn: string | null; taskName: string }) {
  const router = useRouter();
  const [date, setDate] = useState(todayMyt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function save(value: string | null) {
    setPending(true);
    setError(undefined);
    const r = await sendJson(`/api/teams/${teamId}/tasks/${taskId}/complete`, "POST", { completedOn: value });
    setPending(false);
    if (!r.ok) setError(r.fields?.completedOn?.[0] ?? r.error);
    else router.refresh();
  }
  return (
    <span className="inline-flex flex-col items-start gap-1">
      {completedOn ? (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          {completedOn}
          <Button type="button" variant="secondary" className="min-h-8 px-2 py-1 text-xs" disabled={pending} onClick={() => save(null)} aria-label={`Mark "${taskName}" not done`}>
            Undo
          </Button>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          <Input type="date" value={date} max={todayMyt()} onChange={(e) => setDate(e.target.value)} className="w-36 py-1 text-xs" aria-label={`Completion date for "${taskName}"`} />
          <Button type="button" className="min-h-8 whitespace-nowrap px-2 py-1 text-xs" disabled={pending || !date} onClick={() => save(date)}>
            Mark done
          </Button>
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
