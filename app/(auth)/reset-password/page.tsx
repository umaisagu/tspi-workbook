import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/form";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  if (typeof token !== "string" || token.length < 20) {
    return (
      <div className="space-y-4">
        <Alert>This reset link is incomplete. Please open the link from your e-mail again.</Alert>
        <Link href="/forgot-password" className="text-sm text-blue-700 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }
  return <ResetForm token={token} />;
}
