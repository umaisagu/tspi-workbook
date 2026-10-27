"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormType } from "@/generated/prisma/enums";
import { Alert, Button, Input, sendJson } from "@/components/ui/form";

const FORMS: FormType[] = ["SI", "LOGT", "LOGD", "LOGAI", "PEER", "TASK", "SCHEDULE", "LOGTEST", "WEEK", "SUMS", "SUMP", "SUMQ", "SUMTASK", "CCR"];

/** Converts an instant to a value for <input type="datetime-local"> in Malaysia time (UTC+8). */
function toLocalInput(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16);
}

export function MilestoneEditor({
  milestone,
}: {
  milestone: { id: string; code: string; title: string; week: number; dueAt: string; requiredForms: FormType[]; peerRequired: boolean };
}) {
  const router = useRouter();
  const [forms, setForms] = useState<FormType[]>(milestone.requiredForms);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    setSaved(false);
    const due = String(formData.get("dueAt"));
    const r = await sendJson(`/api/milestones/${milestone.id}`, "PATCH", {
      title: formData.get("title"),
      week: formData.get("week"),
      dueAt: `${due}:00+08:00`,
      requiredForms: forms,
      peerRequired: formData.get("peerRequired") === "on",
    });
    setPending(false);
    if (!r.ok) setError(r.error);
    else {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form action={onSubmit} className="space-y-3 rounded-md border border-slate-200 p-3">
      <div className="grid gap-2 sm:grid-cols-[4rem_1fr_6rem_14rem]">
        <span className="self-center font-semibold">{milestone.code}</span>
        <Input name="title" defaultValue={milestone.title} aria-label="Title" />
        <Input name="week" type="number" min={1} max={30} defaultValue={milestone.week} aria-label="Week" />
        <Input name="dueAt" type="datetime-local" defaultValue={toLocalInput(milestone.dueAt)} aria-label="Due (MYT)" />
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-slate-600">Forms required at this milestone</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {FORMS.map((f) => (
            <label key={f} className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={forms.includes(f)}
                onChange={() => setForms(forms.includes(f) ? forms.filter((x) => x !== f) : [...forms, f])}
              />
              {f}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="peerRequired" defaultChecked={milestone.peerRequired} /> Collect PEER evaluations
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-sm text-green-700">Saved</span>}
      </div>
      {error && <Alert>{error}</Alert>}
    </form>
  );
}
