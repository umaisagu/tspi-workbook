"use client";

/** Generic error message: no details from the server, only the digest to match the server log. */
export function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;
  return (
    <div className="mx-auto max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-slate-600">The page could not be loaded. Please try again; if it keeps happening, tell your lecturer.</p>
      {digest && <p className="text-xs text-slate-500">Reference: {digest}</p>}
      <button type="button" onClick={() => retry()} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
        Try again
      </button>
    </div>
  );
}
