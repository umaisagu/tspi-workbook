"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Field, Input, sendJson, useSubmit } from "@/components/ui/form";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import { fieldErrorsFrom } from "@/lib/schemas/errors";

export default function ForgotPasswordPage() {
  const { pending, error, fields, setFields, run } = useSubmit();
  const [sent, setSent] = useState(false);

  async function onSubmit(formData: FormData) {
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return setFields(fieldErrorsFrom(parsed.error));
    const r = await run(() => sendJson("/api/auth/forgot-password", "POST", parsed.data));
    if (r.ok) setSent(true);
  }

  return (
    <form action={onSubmit} className="space-y-4" noValidate>
      <h1 className="text-lg font-semibold">Reset your password</h1>
      {sent ? (
        <Alert kind="success">If an account exists for that e-mail, a reset link is on its way. It works for one hour.</Alert>
      ) : (
        <>
          {error && !Object.keys(fields).length && <Alert>{error}</Alert>}
          <Field label="UNIMAS e-mail" error={fields.email}>
            <Input name="email" type="email" autoComplete="email" invalid={!!fields.email} required />
          </Field>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-blue-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
