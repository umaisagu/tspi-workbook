"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Thresholds } from "@/lib/monitoring/settings";
import { Alert, Button, Field, Input } from "@/components/ui/form";
import { sendJson } from "@/components/ui/form";

type Num = { group: keyof Thresholds; key: string; label: string; hint: string; percent?: boolean };
const FIELDS: { title: string; fields: Num[] }[] = [
  {
    title: "Low share",
    fields: [
      { group: "lowShare", key: "fraction", label: "Share below (% of fair share)", hint: "Fair share = 100% ÷ team size", percent: true },
      { group: "lowShare", key: "windowWeeks", label: "Recent window (weeks)", hint: "Also checked over the current milestone" },
    ],
  },
  { title: "Inactive", fields: [{ group: "inactive", key: "weeks", label: "Weeks without LOGT", hint: "Consecutive working weeks" }] },
  {
    title: "Hours without output",
    fields: [
      { group: "hoursWithoutOutput", key: "windowWeeks", label: "Window (weeks)", hint: "No tasks, commits or tests in this window" },
      { group: "hoursWithoutOutput", key: "minHours", label: "Minimum hours", hint: "Hours logged before it counts" },
    ],
  },
  {
    title: "Backfilling",
    fields: [
      { group: "backfill", key: "lagDays", label: "Typed this many days late", hint: "Entry date vs time typed" },
      { group: "backfill", key: "minEntries", label: "Entries in one sitting", hint: "" },
      { group: "backfill", key: "sessionGapMinutes", label: "Sitting gap (minutes)", hint: "Longer gaps start a new sitting" },
      { group: "backfill", key: "daysBeforeDeadline", label: "Days before a deadline", hint: "" },
    ],
  },
  {
    title: "Peer mismatch",
    fields: [
      { group: "peerMismatch", key: "selfAbovePeers", label: "Self above teammates by (of 50)", hint: "" },
      { group: "peerMismatch", key: "lowPeerAverage", label: "Teammates' average at or below (of 50)", hint: "" },
    ],
  },
  {
    title: "Team status",
    fields: [
      { group: "teamStatus", key: "atRiskSpi", label: "At risk below (EV ÷ PV, %)", hint: "", percent: true },
      { group: "teamStatus", key: "behindSpi", label: "Behind below (EV ÷ PV, %)", hint: "", percent: true },
      { group: "teamStatus", key: "inactiveDays", label: "Days without activity (at risk)", hint: "Twice this: behind" },
    ],
  },
];

/** Lecturer settings for contribution flags and team status. */
export function SettingsForm({ initial }: { initial: Thresholds }) {
  const router = useRouter();
  const [t, setT] = useState<Thresholds>(initial);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const get = (f: Num) => (t[f.group] as Record<string, number | boolean>)[f.key] as number;
  const set = (f: Num, v: string) => {
    const n = v === "" ? NaN : Number(v) / (f.percent ? 100 : 1);
    setT({ ...t, [f.group]: { ...(t[f.group] as object), [f.key]: n } });
    setSaved(false);
  };
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(undefined);
        const r = await sendJson("/api/monitor/settings", "PUT", { thresholds: t });
        if (!r.ok) return setError(r.error);
        setSaved(true);
        router.refresh();
      }}
    >
      {FIELDS.map((s) => (
        <fieldset key={s.title} className="rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold">{s.title}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {s.fields.map((f) => (
              <Field key={`${f.group}.${f.key}`} label={f.label} hint={f.hint || undefined}>
                <Input type="number" step="any" value={Number.isNaN(get(f)) ? "" : String(Math.round(get(f) * (f.percent ? 100 : 1) * 1000) / 1000)} onChange={(e) => set(f, e.target.value)} />
              </Field>
            ))}
          </div>
        </fieldset>
      ))}
      <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold">Missing forms</legend>
        {(["week", "peer"] as const).map((k) => (
          <label key={k} className="mr-6 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={t.missingForms[k]} onChange={(e) => setT({ ...t, missingForms: { ...t.missingForms, [k]: e.target.checked } })} />
            Flag {k === "week" ? "WEEK reports" : "PEER evaluations"} that are missing or late
          </label>
        ))}
      </fieldset>
      {error && <Alert>{error}</Alert>}
      {saved && <Alert kind="success">Saved. Flags are recomputed with the new thresholds.</Alert>}
      <Button type="submit">Save settings</Button>
    </form>
  );
}
