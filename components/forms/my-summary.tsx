"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MySump } from "@/lib/tsp/personal";
import { Alert, Button, sendJson } from "@/components/ui/form";

/** MYSUMP "My Size Contribution": plan and actual, typed by the member; test cases come from LOGTEST. */
export function MySizeEditor({ teamId, rows, canEdit }: { teamId: string; rows: MySump["size"]; canEdit: boolean }) {
  const router = useRouter();
  const typed = rows.filter((r) => r.key !== "Tests");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const text = (v: number | null) => (v === null ? "" : String(v));

  function start() {
    setDraft(Object.fromEntries(typed.flatMap((r) => [[`plan${r.key}`, text(r.plan)], [`act${r.key}`, text(r.actual)]])));
    setError(undefined);
    setEditing(true);
  }
  async function save() {
    setPending(true);
    const r = await sendJson(`/api/teams/${teamId}/my-size`, "PUT", draft);
    setPending(false);
    if (!r.ok) return setError(r.error);
    setEditing(false);
    router.refresh();
  }
  const cell = (key: string, value: number | null, label: string) =>
    editing && !key.endsWith("Tests") ? (
      <input
        aria-label={label}
        inputMode="numeric"
        className="w-24 rounded border border-slate-300 px-1 py-1 text-right"
        value={draft[key] ?? ""}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      />
    ) : value === null ? (
      "—"
    ) : (
      value.toLocaleString("en-MY")
    );

  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2 text-left font-medium" />
              <th className="px-2 py-2 text-right font-medium">Plan</th>
              <th className="px-2 py-2 text-right font-medium">Actual</th>
              <th className="px-2 py-2 text-left font-medium">What to count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-slate-100">
                <td className="px-2 py-1">{r.label}</td>
                <td className="px-2 py-1 text-right">{r.key === "Tests" ? "" : cell(`plan${r.key}`, r.plan, `${r.label} plan`)}</td>
                <td className="px-2 py-1 text-right">{cell(`act${r.key}`, r.actual, `${r.label} actual`)}</td>
                <td className="px-2 py-1 text-xs text-slate-500">{r.help}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit &&
        (editing ? (
          <div className="flex gap-2">
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save size contribution"}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={start}>
            Edit size contribution
          </Button>
        ))}
    </div>
  );
}
