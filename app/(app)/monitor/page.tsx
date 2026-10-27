import type { Metadata } from "next";
import { db } from "@/lib/db";
import { isLecturer } from "@/lib/auth/permissions";
import { requireStaffPage } from "@/lib/server/page-guards";
import { Card, PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { roleLabel } from "@/lib/tsp/roles";

export const metadata: Metadata = { title: "Monitor" };

/** Stage 1: list of the teams the viewer may monitor. The full dashboard arrives in Stage 6. */
export default async function MonitorPage() {
  const user = await requireStaffPage();
  const groups = await db.labGroup.findMany({
    where: { semester: { isActive: true }, ...(isLecturer(user) ? {} : { id: { in: [...user.demonstratorLabGroupIds] } }) },
    orderBy: { name: "asc" },
    include: {
      teams: {
        orderBy: { name: "asc" },
        include: {
          memberships: { where: { leftAt: null }, include: { user: { select: { name: true } }, roles: true }, orderBy: { joinedAt: "asc" } },
        },
      },
    },
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Monitor" subtitle="Teams in your lab groups (active semester)" />
      {groups.length === 0 && <Alert kind="info">No lab groups assigned to you in the active semester.</Alert>}
      {groups.map((g) => (
        <Card key={g.id} title={g.name}>
          <div className="grid gap-3 md:grid-cols-2">
            {g.teams.map((t) => (
              <div key={t.id} className="rounded-md border border-slate-200 p-3">
                <div className="font-medium">{t.name}</div>
                <div className="mb-2 text-xs text-slate-500">{t.projectTitle ?? "No project title yet"}</div>
                <ul className="space-y-0.5 text-sm">
                  {t.memberships.map((m) => (
                    <li key={m.id}>
                      {m.user.name} <span className="text-slate-500">{m.roles.map((r) => roleLabel(r.role)).join(", ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {g.teams.length === 0 && <p className="text-sm text-slate-500">No teams.</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}
