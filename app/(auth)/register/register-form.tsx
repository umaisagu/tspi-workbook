"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, sendJson, useSubmit } from "@/components/ui/form";
import { isAllowedEmail } from "@/lib/auth/email";
import { registerSchema } from "@/lib/schemas/auth";
import { fieldErrorsFrom } from "@/lib/schemas/errors";

export function RegisterForm({ domains }: { domains: string[] }) {
  const router = useRouter();
  const { pending, error, fields, setFields, run } = useSubmit();

  async function onSubmit(formData: FormData) {
    const parsed = registerSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return setFields(fieldErrorsFrom(parsed.error));
    if (!isAllowedEmail(parsed.data.email, domains)) {
      return setFields({ email: [`Use your UNIMAS e-mail (${domains.map((d) => `@${d}`).join(" or ")}).`] });
    }
    const r = await run(() => sendJson("/api/auth/register", "POST", parsed.data));
    if (r.ok) router.push("/login?registered=1");
  }

  return (
    <form action={onSubmit} className="space-y-4" noValidate>
      <h1 className="text-lg font-semibold">Create an account</h1>
      {error && !Object.keys(fields).length && <Alert>{error}</Alert>}
      <Field label="Full name" error={fields.name}>
        <Input name="name" autoComplete="name" invalid={!!fields.name} required />
      </Field>
      <Field label="UNIMAS e-mail" error={fields.email} hint={domains.map((d) => `@${d}`).join(" or ")}>
        <Input name="email" type="email" autoComplete="email" invalid={!!fields.email} required />
      </Field>
      <Field label="Password" error={fields.password} hint="At least 10 characters, with letters and a number">
        <Input name="password" type="password" autoComplete="new-password" invalid={!!fields.password} required />
      </Field>
      <Field label="Confirm password" error={fields.confirmPassword}>
        <Input name="confirmPassword" type="password" autoComplete="new-password" invalid={!!fields.confirmPassword} required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm">
        Already registered?{" "}
        <Link href="/login" className="text-blue-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
