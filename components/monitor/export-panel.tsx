"use client";

import { useState } from "react";
import { Select } from "@/components/ui/form";

const FORMS = ["SI", "LOGT", "LOGD", "LOGAI", "TASK", "SCHEDULE", "LOGTEST", "WEEK", "SUMTASK", "SUMS", "SUMP", "SUMQ", "CCR"];

/** Downloads: one form, the whole team, or one member's contribution report for a milestone (Excel or PDF). */
export function ExportPanel({
  teamId,
  members,
  milestones,
  canContribution,
}: {
  teamId: string;
  members: { id: string; name: string }[];
  milestones: { id: string; code: string }[];
  canContribution: boolean;
}) {
  const [form, setForm] = useState("TASK");
  const [member, setMember] = useState(members[0]?.id ?? "");
  const [milestone, setMilestone] = useState(milestones[0]?.id ?? "");
  const link = (href: string, label: string) => (
    <a href={href} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50" download>
      {label}
    </a>
  );
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-28 text-slate-600">Whole team</span>
        {link(`/api/export/team?team=${teamId}&format=xlsx`, "Excel")}
        {link(`/api/export/team?team=${teamId}&format=pdf`, "PDF")}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-28 text-slate-600">One form</span>
        <Select value={form} onChange={(e) => setForm(e.target.value)} className="w-auto" aria-label="Form">
          {FORMS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </Select>
        {link(`/api/export/form?team=${teamId}&form=${form}&format=xlsx`, "Excel")}
        {link(`/api/export/form?team=${teamId}&form=${form}&format=pdf`, "PDF")}
      </div>
      {canContribution && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-28 text-slate-600">Contribution</span>
          <Select value={member} onChange={(e) => setMember(e.target.value)} className="w-auto" aria-label="Member">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Select value={milestone} onChange={(e) => setMilestone(e.target.value)} className="w-auto" aria-label="Milestone">
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code}
              </option>
            ))}
          </Select>
          {link(`/api/export/contribution?member=${member}&milestone=${milestone}&format=xlsx`, "Excel")}
          {link(`/api/export/contribution?member=${member}&milestone=${milestone}&format=pdf`, "PDF")}
        </div>
      )}
    </div>
  );
}
