import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/server/viewer";
import { currentTeamFor } from "@/lib/server/teams";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { localDate, weekOf } from "@/lib/tsp/calendar";
import { roleLabel } from "@/lib/tsp/roles";

export const metadata: Metadata = { title: "Dashboard" };

const dateFmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });

export default async function DashboardPage() {
  const user = await requirePageUser();
  const current = await currentTeamFor(user);
  if (!current) {
    return (
      <>
        <PageHeader title={`Hello, ${user.name}`} />
        <Alert kind="info">You are not in a team yet. Your lecturer will add you to a team after Lab 01.</Alert>
      </>
    );
  }
  const { team, membership } = current;
  const semester = team.labGroup.semester;
  const week = weekOf(localDate(new Date()), semester.week1Monday);
  const milestones = await db.milestone.findMany({ where: { semesterId: semester.id }, orderBy: { week: "asc" } });

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hello, ${user.name}`}
        subtitle={`${team.name} · ${team.labGroup.name} · ${semester.name} · Week ${Math.max(week, 0)}${semester.breakWeeks.includes(week) ? " (break)" : ""}`}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="My TSPi roles" actions={<Link href="/team/roster" className="text-sm text-blue-700 hover:underline">Team</Link>}>
          {membership.roles.length ? (
            <div className="flex flex-wrap gap-2">
              {membership.roles.map((r) => (
                <Badge key={r} tone="blue">{roleLabel(r)}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No role assigned yet.</p>
          )}
        </Card>
        <Card title="Milestones">
          <ul className="space-y-2 text-sm">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{m.code}</span> {m.title}
                </span>
                <span className="text-slate-600">{dateFmt.format(m.dueAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Alert kind="info">Forms (FORM-SI, LOGT, LOGD, LOGAI, …) and your hours and tasks will appear here as they are built.</Alert>
    </div>
  );
}
