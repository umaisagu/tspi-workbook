"use client";

import "./globals.css";
import { ErrorState } from "@/components/ui/error-state";

/** Replaces the root layout when it fails; must render its own <html> and <body>. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 px-4 py-16">
        <title>Error · TSPi Workbook</title>
        <ErrorState error={error} retry={retry} />
      </body>
    </html>
  );
}
