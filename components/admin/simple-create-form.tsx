"use client";

import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, sendJson, useSubmit } from "@/components/ui/form";

export interface SimpleField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  defaultValue?: string;
}

/**
 * A small form that posts its fields (plus fixed `extra` values) as JSON and refreshes the page.
 * Server-side Zod validation errors are shown next to the fields.
 */
export function SimpleCreateForm({
  url,
  method = "POST",
  fields: inputs,
  extra,
  submitLabel,
  transform,
}: {
  url: string;
  method?: string;
  fields: SimpleField[];
  extra?: Record<string, string>;
  submitLabel: string;
  transform?: "breakWeeks";
}) {
  const router = useRouter();
  const { pending, error, fields, run } = useSubmit();

  async function onSubmit(formData: FormData) {
    const body: Record<string, unknown> = { ...Object.fromEntries(formData), ...extra };
    for (const [k, v] of Object.entries(body)) if (v === "") delete body[k];
    if (transform === "breakWeeks") {
      const raw = typeof body.breakWeeks === "string" ? body.breakWeeks : "";
      body.breakWeeks = raw.split(/[\s,]+/).filter(Boolean).map(Number);
    }
    const r = await run(() => sendJson(url, method, body));
    if (r.ok) router.refresh();
  }

  return (
    <form action={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" noValidate>
      {error && !Object.keys(fields).length && (
        <div className="sm:col-span-2 lg:col-span-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {inputs.map((f) => (
        <Field key={f.name} label={f.label} error={fields[f.name]} hint={f.hint}>
          <Input name={f.name} type={f.type ?? "text"} placeholder={f.placeholder} defaultValue={f.defaultValue} invalid={!!fields[f.name]} />
        </Field>
      ))}
      <div className="flex items-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
