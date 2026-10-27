import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { thresholdsFor } from "@/lib/server/monitoring";
import { requireLecturerPage } from "@/lib/server/page-guards";
import { PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { SettingsForm } from "@/components/monitor/settings-form";

export const metadata: Metadata = { title: "Flag settings" };

export default async function MonitorSettingsPage() {
  await requireLecturerPage();
  const semester = await db.semester.findFirst({ where: { isActive: true } });
  return (
    <div className="space-y-5">
      <PageHeader
        title="Contribution flag settings"
        subtitle={semester ? `${semester.name} (active semester)` : undefined}
        actions={
          <Link href="/monitor" className="text-sm text-blue-700 hover:underline">
            ← Class overview
          </Link>
        }
      />
      {semester ? <SettingsForm initial={await thresholdsFor(semester.id)} /> : <Alert kind="info">Activate a semester first.</Alert>}
    </div>
  );
}
