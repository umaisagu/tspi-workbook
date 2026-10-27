"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input, sendJson, useSubmit } from "@/components/ui/form";
import { teamUpdateSchema } from "@/lib/schemas/admin";
import { fieldErrorsFrom } from "@/lib/schemas/errors";

export function TeamDetailsForm({
  teamId,
  initial,
  allowRename,
}: {
  teamId: string;
  initial: { name: string; projectTitle: string; clientName: string; repoUrl: string };
  allowRename: boolean;
}) {
  const router = useRouter();
  const { pending, error, fields, setFields, run } = useSubmit();
  const [saved, setSaved] = useState(false);

  async function onSubmit(formData: FormData) {
    setSaved(false);
    const raw = Object.fromEntries(formData);
    const parsed = teamUpdateSchema.safeParse(raw);
    if (!parsed.success) return setFields(fieldErrorsFrom(parsed.error));
    const r = await run(() => sendJson(`/api/teams/${teamId}`, "PATCH", parsed.data));
    if (r.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form action={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      {error && !Object.keys(fields).length && (
        <div className="sm:col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}
      {saved && (
        <div className="sm:col-span-2">
          <Alert kind="success">Saved.</Alert>
        </div>
      )}
      {allowRename && (
        <Field label="Team name" error={fields.name}>
          <Input name="name" defaultValue={initial.name} invalid={!!fields.name} />
        </Field>
      )}
      <Field label="Project title" error={fields.projectTitle}>
        <Input name="projectTitle" defaultValue={initial.projectTitle} invalid={!!fields.projectTitle} />
      </Field>
      <Field label="Client" error={fields.clientName}>
        <Input name="clientName" defaultValue={initial.clientName} invalid={!!fields.clientName} />
      </Field>
      <Field label="GitHub repository URL" error={fields.repoUrl} hint="https://github.com/owner/repo">
        <Input name="repoUrl" defaultValue={initial.repoUrl} invalid={!!fields.repoUrl} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save team details"}
        </Button>
      </div>
    </form>
  );
}
