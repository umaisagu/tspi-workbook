"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AuthError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="px-4 py-10">
      <ErrorState error={error} retry={retry} />
    </div>
  );
}
