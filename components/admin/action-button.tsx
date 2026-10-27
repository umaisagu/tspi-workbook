"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, sendJson } from "@/components/ui/form";

/** A button that sends one API request (optionally after confirming) and refreshes the page. */
export function ActionButton({
  url,
  method,
  body,
  label,
  confirmText,
  variant = "secondary",
}: {
  url: string;
  method: string;
  body?: unknown;
  label: string;
  confirmText?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={async () => {
          if (confirmText && !confirm(confirmText)) return;
          setPending(true);
          setError(undefined);
          const r = await sendJson(url, method, body);
          setPending(false);
          if (!r.ok) setError(r.error);
          else router.refresh();
        }}
      >
        {pending ? "…" : label}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
