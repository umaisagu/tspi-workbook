import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireLecturerPage } from "@/lib/server/page-guards";
import { Card, PageHeader } from "@/components/ui/card";
import { SimpleCreateForm } from "@/components/admin/simple-create-form";
import { ActionButton } from "@/components/admin/action-button";
import { MilestoneEditor } from "@/components/admin/milestone-editor";
import { SemesterSettings } from "@/components/admin/semester-settings";
import { formatDateOnly } from "@/lib/tsp/calendar";

export const metadata: Metadata = { title: "Semester" };

export default async function SemesterPage({ params }: PageProps<"/admin/semesters/[id]">) {
  await requireLecturerPage();
  const { id } = await params;
  const semester = await db.semester.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { week: "asc" } },
      labGroups: {
        orderBy: { name: "asc" },
        include: {
          demonstrators: { include: { user: { select: { id: true, name: true, email: true } } } },
          teams: { orderBy: { name: "asc" }, include: { _count: { select: { memberships: { where: { leftAt: null } } } } } },
        },
      },
    },
  });
  if (!semester) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        title={semester.name}
        subtitle={<Link href="/admin" className="text-blue-700 hover:underline">← All semesters</Link>}
        actions={
          semester.labGroups.length === 0 ? (
            <ActionButton
              url={`/api/semesters/${semester.id}`}
              method="DELETE"
              label="Delete semester"
              variant="danger"
              redirectTo="/admin"
              confirmText={`Delete semester "${semester.name}" and its milestones? This cannot be undone.`}
            />
          ) : undefined
        }
      />
      <Card title="Semester settings">
        <SemesterSettings
          semester={{
            id: semester.id,
            name: semester.name,
            week1Monday: formatDateOnly(semester.week1Monday),
            weekCount: semester.weekCount,
            breakWeeks: semester.breakWeeks,
            hiddenPhases: semester.hiddenPhases,
            isActive: semester.isActive,
          }}
        />
      </Card>
      <Card title="Milestones">
        <div className="space-y-3">
          {semester.milestones.map((m) => (
            <MilestoneEditor
              key={m.id}
              milestone={{ id: m.id, code: m.code, title: m.title, week: m.week, dueAt: m.dueAt.toISOString(), requiredForms: m.requiredForms, peerRequired: m.peerRequired }}
            />
          ))}
        </div>
      </Card>
      {semester.labGroups.map((g) => (
        <Card
          key={g.id}
          title={`${g.name}${g.schedule ? ` · ${g.schedule}` : ""}`}
          actions={
            <ActionButton url={`/api/lab-groups/${g.id}`} method="DELETE" label="Delete group" confirmText={`Delete ${g.name}?`} />
          }
        >
          <div className="space-y-4">
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-700">Demonstrators</h3>
              <ul className="mb-2 space-y-1 text-sm">
                {g.demonstrators.map((d) => (
                  <li key={d.userId} className="flex flex-wrap items-center gap-2">
                    {d.user.name} <span className="text-slate-500">{d.user.email}</span>
                    <ActionButton url={`/api/lab-groups/${g.id}/demonstrators/${d.userId}`} method="DELETE" label="Remove" />
                  </li>
                ))}
                {g.demonstrators.length === 0 && <li className="text-slate-500">None assigned.</li>}
              </ul>
              <SimpleCreateForm
                url={`/api/lab-groups/${g.id}/demonstrators`}
                submitLabel="Assign demonstrator"
                fields={[{ name: "email", label: "Demonstrator e-mail", type: "email" }]}
              />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-700">Teams</h3>
              <ul className="mb-2 divide-y divide-slate-100 text-sm">
                {g.teams.map((t) => (
                  <li key={t.id} className="py-1">
                    <Link href={`/admin/teams/${t.id}`} className="text-blue-700 hover:underline">
                      {t.name}
                    </Link>{" "}
                    <span className="text-slate-500">
                      {t._count.memberships} members{t.projectTitle ? ` · ${t.projectTitle}` : ""}
                    </span>
                  </li>
                ))}
                {g.teams.length === 0 && <li className="py-1 text-slate-500">No teams yet.</li>}
              </ul>
              <SimpleCreateForm
                url="/api/teams"
                submitLabel="Create team"
                extra={{ labGroupId: g.id }}
                fields={[
                  { name: "name", label: "Team name" },
                  { name: "projectTitle", label: "Project title" },
                  { name: "repoUrl", label: "GitHub repo URL", placeholder: "https://github.com/owner/repo" },
                ]}
              />
            </div>
          </div>
        </Card>
      ))}
      <Card title="New lab group">
        <SimpleCreateForm
          url="/api/lab-groups"
          submitLabel="Create lab group"
          extra={{ semesterId: semester.id }}
          fields={[
            { name: "name", label: "Name", placeholder: "Group 1" },
            { name: "schedule", label: "Schedule", placeholder: "Wed 4–6 pm" },
          ]}
        />
      </Card>
    </div>
  );
}
