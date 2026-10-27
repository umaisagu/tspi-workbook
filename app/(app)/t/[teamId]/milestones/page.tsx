import type { Metadata } from "next";
import Link from "next/link";
import { isStaff } from "@/lib/auth/permissions";
import { requireTeamPage } from "@/lib/server/team-page";
import { loadTeamStatus } from "@/lib/server/team-status";
import { Card, PageHeader } from "@/components/ui/card";
import { CompletionGrid } from "@/components/dashboard/completion-grid";
import { StatusBadge } from "@/components/forms/status-badge";

export const metadata: Metadata = { title: "Milestones" };

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });

/** M1–M4: which required forms are complete, late, missing or not yet due. */
export default async function MilestonesPage({ params }: PageProps<"/t/[teamId]/milestones">) {
  const { teamId } = await params;
  const { user, team } = await requireTeamPage(teamId);
  const s = await loadTeamStatus(teamId);
  const names = Object.fromEntries(s.members.map((m) => [m.id, m.name]));
  return (
    <div className="space-y-5">
      <PageHeader
        title="Milestones"
        subtitle={`${team.name} · ${team.semesterName}`}
        actions={
          <Link href={`/t/${teamId}`} className="text-sm text-blue-700 hover:underline">
            ← Team dashboard
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {s.completion.map((m) => (
          <a key={m.id} href={`#${m.code}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{m.code}</span>
              <StatusBadge status={m.result.status} />
            </div>
            <div className="text-sm text-slate-700">{m.title}</div>
            <div className="mt-2 h-2 rounded bg-slate-100" role="progressbar" aria-valuenow={Math.round(m.result.percent * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 rounded bg-blue-600" style={{ width: `${Math.round(m.result.percent * 100)}%` }} />
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {m.result.done} of {m.result.total} done · due {dateFmt.format(new Date(m.dueAt))}
            </div>
          </a>
        ))}
      </div>
      {s.completion.map((m) => (
        <section key={m.id} id={m.code} className="scroll-mt-4">
          <Card
            title={
              <span className="inline-flex flex-wrap items-center gap-2">
                {m.code} · {m.title} (week {m.week}) <StatusBadge status={m.result.status} />
              </span>
            }
            actions={<span className="text-sm text-slate-600">Due {dateFmt.format(new Date(m.dueAt))}</span>}
          >
            <CompletionGrid teamId={teamId} result={m.result} names={names} linkMembers={isStaff(user)} />
          </Card>
        </section>
      ))}
      <p className="text-xs text-slate-500">
        Complete: done by the deadline. Late: done only after it (for logs: entries typed in after the deadline). Missing: past the deadline and not
        done. Required forms per milestone are set by the lecturer.
      </p>
    </div>
  );
}
