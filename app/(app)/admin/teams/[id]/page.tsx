import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLecturerPage } from "@/lib/server/page-guards";
import { teamWithRoster } from "@/lib/server/teams";
import { rosterView } from "@/lib/server/roster-view";
import { Card, PageHeader } from "@/components/ui/card";
import { RosterManager } from "@/components/roster/roster-manager";
import { TeamDetailsForm } from "@/components/roster/team-details-form";

export const metadata: Metadata = { title: "Team" };

export default async function AdminTeamPage({ params }: PageProps<"/admin/teams/[id]">) {
  const user = await requireLecturerPage();
  const { id } = await params;
  const team = await teamWithRoster(id);
  if (!team) notFound();
  const view = rosterView(team, user.userId);
  return (
    <div className="space-y-5">
      <PageHeader
        title={team.name}
        subtitle={
          <Link href={`/admin/semesters/${team.labGroup.semesterId}`} className="text-blue-700 hover:underline">
            ← {team.labGroup.semester.name} · {team.labGroup.name}
          </Link>
        }
      />
      <Card title="Team details">
        <TeamDetailsForm
          teamId={team.id}
          allowRename
          initial={{ name: team.name, projectTitle: team.projectTitle ?? "", clientName: team.clientName ?? "", repoUrl: team.repoUrl ?? "" }}
        />
      </Card>
      <Card title="Members and TSPi roles">
        <RosterManager teamId={team.id} members={view.rows} canManage errors={view.errors} warnings={view.warnings} />
      </Card>
    </div>
  );
}
