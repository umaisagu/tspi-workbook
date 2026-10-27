"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="py-10">
      <ErrorState error={error} retry={retry} />
    </div>
  );
}
