"use client";

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export type FieldErrors = Record<string, string[] | undefined>;

export function Field({ label, error, hint, children }: { label: string; error?: string[]; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-slate-500">{hint}</span>}
      {error?.map((e) => (
        <span key={e} className="block text-xs text-red-600" role="alert">
          {e}
        </span>
      ))}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base shadow-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 aria-[invalid=true]:border-red-500 sm:text-sm";

export function Input({ invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} aria-invalid={invalid || undefined} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select({ invalid, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select {...props} aria-invalid={invalid || undefined} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Button({
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-blue-700 text-white hover:bg-blue-800 disabled:bg-blue-300",
    secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:text-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition ${styles} ${props.className ?? ""}`}
    />
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "success" | "info" | "warning"; children: ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-green-200 bg-green-50 text-green-800",
    info: "border-blue-200 bg-blue-50 text-blue-800",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}

interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  fields?: FieldErrors;
}

/** Sends JSON to an API route and returns the parsed response with field errors. */
export async function sendJson<T = unknown>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => ({}));
    const obj = (typeof json === "object" && json !== null ? json : {}) as { error?: string; fields?: FieldErrors };
    if (!res.ok) return { ok: false, error: obj.error ?? `Request failed (${res.status})`, fields: obj.fields };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}

/** Small state helper for forms that post to an API route. */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [fields, setFields] = useState<FieldErrors>({});
  async function run<T>(fn: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
    setPending(true);
    setError(undefined);
    setFields({});
    const r = await fn();
    setPending(false);
    if (!r.ok) {
      setError(r.error);
      setFields(r.fields ?? {});
    }
    return r;
  }
  return { pending, error, fields, setFields, setError, run };
}
