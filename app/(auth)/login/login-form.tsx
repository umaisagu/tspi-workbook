"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Alert, Button, Field, Input } from "@/components/ui/form";
import { loginSchema } from "@/lib/schemas/auth";

export function LoginForm({ next, registered, reset }: { next: string; registered: boolean; reset: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(formData: FormData) {
    setError(undefined);
    const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setPending(true);
    const res = await signIn("credentials", { ...parsed.data, redirect: false });
    setPending(false);
    if (!res || res.error) {
      setError(
        res?.code === "rate_limited"
          ? "Too many sign-in attempts. Please wait 15 minutes and try again."
          : "Incorrect e-mail or password.",
      );
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4" noValidate>
      <h1 className="text-lg font-semibold">Sign in</h1>
      {registered && <Alert kind="success">Account created. You can sign in now.</Alert>}
      {reset && <Alert kind="success">Password changed. Sign in with your new password.</Alert>}
      {error && <Alert>{error}</Alert>}
      <Field label="UNIMAS e-mail">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <div className="flex justify-between text-sm">
        <Link href="/register" className="text-blue-700 hover:underline">
          Create an account
        </Link>
        <Link href="/forgot-password" className="text-blue-700 hover:underline">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
