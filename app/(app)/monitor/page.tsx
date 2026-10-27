import type { Metadata } from "next";
import Link from "next/link";
import { isLecturer } from "@/lib/auth/permissions";
import { FLAG_ORDER, loadClassOverview } from "@/lib/server/monitoring";
import { requireStaffPage } from "@/lib/server/page-guards";
import { Card, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { OverviewTable } from "@/components/monitor/overview-table";
import { FlagList } from "@/components/monitor/flag-list";
import { ActionButton } from "@/components/admin/action-button";

export const metadata: Metadata = { title: "Monitor" };

/** Lecturer / demonstrator class overview and the class-wide "Needs attention" list. */
export default async function MonitorPage() {
  const user = await requireStaffPage();
  const o = await loadClassOverview(user);
  const lecturer = isLecturer(user);
  const attention = [...o.attention].sort((a, b) => FLAG_ORDER.indexOf(a.type) - FLAG_ORDER.indexOf(b.type) || a.teamName.localeCompare(b.teamName));
  return (
    <div className="space-y-5">
      <PageHeader
        title="Class overview"
        subtitle={lecturer ? "All teams in the active semester" : "Teams in your lab groups"}
        actions={
          lecturer && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {o.githubEnabled && <ActionButton url="/api/github/refresh" method="POST" body={{}} label="Refresh GitHub (next batch)" />}
              <Link href="/monitor/settings" className="text-blue-700 hover:underline">
                Flag settings
              </Link>
            </div>
          )
        }
      />
      {o.rows.length === 0 ? (
        <Alert kind="info">No teams to monitor in the active semester.</Alert>
      ) : (
        <Card>
          <OverviewTable rows={o.rows} />
        </Card>
      )}
      <Card title={`Needs attention (${attention.length})`}>
        <p className="mb-3 text-sm text-slate-600">
          Flags are prompts to look closer, not grades. Each shows its evidence; {lecturer ? "mark it reviewed or dismiss it with a reason." : "the lecturer reviews them."}
        </p>
        <FlagList flags={attention} canReview={lecturer} showTeam emptyText="Nothing needs attention right now." />
      </Card>
    </div>
  );
}
