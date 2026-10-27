"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Phase } from "@/generated/prisma/enums";
import { Alert, Button, Field, Input, sendJson, useSubmit } from "@/components/ui/form";
import { PHASES } from "@/lib/tsp/phases";

export function SemesterSettings({
  semester,
}: {
  semester: { id: string; name: string; week1Monday: string; weekCount: number; breakWeeks: number[]; hiddenPhases: Phase[]; isActive: boolean };
}) {
  const router = useRouter();
  const { pending, error, fields, run } = useSubmit();
  const [hidden, setHidden] = useState<Phase[]>(semester.hiddenPhases);
  const [saved, setSaved] = useState(false);

  async function onSubmit(formData: FormData) {
    setSaved(false);
    const r = await run(() =>
      sendJson(`/api/semesters/${semester.id}`, "PATCH", {
        name: formData.get("name"),
        week1Monday: formData.get("week1Monday"),
        weekCount: formData.get("weekCount"),
        breakWeeks: String(formData.get("breakWeeks") ?? "").split(/[\s,]+/).filter(Boolean).map(Number),
        hiddenPhases: hidden,
        isActive: formData.get("isActive") === "on",
      }),
    );
    if (r.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form action={onSubmit} className="space-y-4" noValidate>
      {error && !Object.keys(fields).length && <Alert>{error}</Alert>}
      {saved && <Alert kind="success">Saved.</Alert>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Name" error={fields.name}>
          <Input name="name" defaultValue={semester.name} invalid={!!fields.name} />
        </Field>
        <Field label="Week 1 Monday" error={fields.week1Monday}>
          <Input name="week1Monday" type="date" defaultValue={semester.week1Monday} invalid={!!fields.week1Monday} />
        </Field>
        <Field label="Number of weeks" error={fields.weekCount}>
          <Input name="weekCount" type="number" min={1} max={30} defaultValue={semester.weekCount} invalid={!!fields.weekCount} />
        </Field>
        <Field label="Break weeks" error={fields.breakWeeks} hint="Comma-separated, e.g. 8">
          <Input name="breakWeeks" defaultValue={semester.breakWeeks.join(", ")} invalid={!!fields.breakWeeks} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">Phases hidden from students&apos; pick lists</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {PHASES.map((p) => (
            <label key={p.code} className="inline-flex items-center gap-1" title={p.name}>
              <input
                type="checkbox"
                checked={hidden.includes(p.code)}
                onChange={() => setHidden(hidden.includes(p.code) ? hidden.filter((x) => x !== p.code) : [...hidden, p.code])}
              />
              {p.code}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={semester.isActive} /> Active semester (only one can be active)
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save semester"}
        </Button>
      </div>
    </form>
  );
}
