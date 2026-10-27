import type { Metadata } from "next";
import { canManageRoster } from "@/lib/auth/permissions";
import { requirePageUser } from "@/lib/server/viewer";
import { currentTeamFor, teamWithRoster } from "@/lib/server/teams";
import { rosterView } from "@/lib/server/roster-view";
import { Card, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { RosterManager } from "@/components/roster/roster-manager";
import { TeamDetailsForm } from "@/components/roster/team-details-form";

export const metadata: Metadata = { title: "Team" };

export default async function TeamRosterPage() {
  const user = await requirePageUser();
  const current = await currentTeamFor(user);
  if (!current) {
    return (
      <>
        <PageHeader title="Team" />
        <Alert kind="info">You are not in a team yet. Your lecturer or team leader will add you.</Alert>
      </>
    );
  }
  const team = (await teamWithRoster(current.team.id))!;
  const canManage = canManageRoster(user, team);
  const view = rosterView(team, user.userId);
  return (
    <div className="space-y-5">
      <PageHeader
        title={team.name}
        subtitle={`${team.labGroup.name} · ${team.labGroup.semester.name}${team.projectTitle ? ` · ${team.projectTitle}` : ""}`}
      />
      <Card title="Members and TSPi roles">
        <RosterManager teamId={team.id} members={view.rows} canManage={canManage} errors={view.errors} warnings={view.warnings} />
      </Card>
      {canManage ? (
        <Card title="Team details">
          <TeamDetailsForm
            teamId={team.id}
            allowRename={false}
            initial={{ name: team.name, projectTitle: team.projectTitle ?? "", clientName: team.clientName ?? "", repoUrl: team.repoUrl ?? "" }}
          />
        </Card>
      ) : (
        <Card title="Team details">
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div><dt className="text-slate-500">Project</dt><dd>{team.projectTitle ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Client</dt><dd>{team.clientName ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Repository</dt><dd className="break-all">{team.repoUrl ?? "—"}</dd></div>
          </dl>
        </Card>
      )}
    </div>
  );
}
