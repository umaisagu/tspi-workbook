import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="mx-auto my-16 max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="text-sm text-slate-600">This page does not exist, or you do not have access to it.</p>
      <Link href="/dashboard" className="inline-block text-sm font-medium text-blue-700 hover:underline">
        Go to your dashboard
      </Link>
    </main>
  );
}
