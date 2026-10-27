"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, sendJson, useSubmit } from "@/components/ui/form";
import { resetPasswordSchema } from "@/lib/schemas/auth";
import { fieldErrorsFrom } from "@/lib/schemas/errors";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const { pending, error, fields, setFields, run } = useSubmit();

  async function onSubmit(formData: FormData) {
    const parsed = resetPasswordSchema.safeParse({ ...Object.fromEntries(formData), token });
    if (!parsed.success) return setFields(fieldErrorsFrom(parsed.error));
    const r = await run(() => sendJson("/api/auth/reset-password", "POST", parsed.data));
    if (r.ok) router.push("/login?reset=1");
  }

  return (
    <form action={onSubmit} className="space-y-4" noValidate>
      <h1 className="text-lg font-semibold">Choose a new password</h1>
      {error && (
        <Alert>
          {error}{" "}
          <Link href="/forgot-password" className="underline">
            Request a new link
          </Link>
        </Alert>
      )}
      <Field label="New password" error={fields.password} hint="At least 10 characters, with letters and a number">
        <Input name="password" type="password" autoComplete="new-password" invalid={!!fields.password} required />
      </Field>
      <Field label="Confirm new password" error={fields.confirmPassword}>
        <Input name="confirmPassword" type="password" autoComplete="new-password" invalid={!!fields.confirmPassword} required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
