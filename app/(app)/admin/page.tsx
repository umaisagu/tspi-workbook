import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireLecturerPage } from "@/lib/server/page-guards";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { SimpleCreateForm } from "@/components/admin/simple-create-form";
import { ActionButton } from "@/components/admin/action-button";
import { formatDateOnly } from "@/lib/tsp/calendar";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireLecturerPage();
  const semesters = await db.semester.findMany({
    orderBy: { week1Monday: "desc" },
    include: { labGroups: { include: { _count: { select: { teams: true } } } } },
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Administration" subtitle="Semesters, lab groups, teams and demonstrators" />
      <Card title="Semesters">
        <ul className="divide-y divide-slate-100">
          {semesters.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <Link href={`/admin/semesters/${s.id}`} className="font-medium text-blue-700 hover:underline">
                  {s.name}
                </Link>{" "}
                {s.isActive && <Badge tone="green">Active</Badge>}
                <div className="text-xs text-slate-500">
                  Week 1: {formatDateOnly(s.week1Monday)} · {s.weekCount} weeks · {s.labGroups.length} lab groups ·{" "}
                  {s.labGroups.reduce((n, g) => n + g._count.teams, 0)} teams
                </div>
              </div>
              {s.labGroups.length === 0 && (
                <ActionButton
                  url={`/api/semesters/${s.id}`}
                  method="DELETE"
                  label="Delete"
                  variant="danger"
                  confirmText={`Delete semester "${s.name}"${s.isActive ? " (the active semester)" : ""} and its milestones? This cannot be undone.`}
                />
              )}
            </li>
          ))}
          {semesters.length === 0 && <li className="py-2 text-sm text-slate-500">No semesters yet.</li>}
        </ul>
      </Card>
      <Card title="New semester">
        <p className="mb-3 text-sm text-slate-600">Milestones M1–M4 are created from the course defaults; you can edit them afterwards.</p>
        <SimpleCreateForm
          url="/api/semesters"
          submitLabel="Create semester"
          transform="breakWeeks"
          fields={[
            { name: "name", label: "Name", placeholder: "Sem 1 2026/2027" },
            { name: "week1Monday", label: "Week 1 Monday", type: "date" },
            { name: "weekCount", label: "Weeks", type: "number", defaultValue: "15" },
            { name: "breakWeeks", label: "Break weeks", defaultValue: "8", hint: "Comma-separated" },
          ]}
        />
      </Card>
    </div>
  );
}
