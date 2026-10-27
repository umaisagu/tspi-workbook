"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TeamStatus } from "@/lib/monitoring/status";
import { Select } from "@/components/ui/form";
import { TeamStatusBadge } from "./team-status-badge";

export interface OverviewRow {
  teamId: string;
  name: string;
  labGroupId: string;
  labGroup: string;
  project: string | null;
  milestone: { code: string; percent: number } | null;
  ev: number;
  pv: number;
  actualHours: number;
  planHours: number;
  daysSinceActivity: number | null;
  status: { status: TeamStatus; reasons: string[] };
  openFlags: number;
}

type SortKey = "name" | "labGroup" | "milestone" | "ev" | "hours" | "forms" | "days" | "status" | "flags";
const STATUS_RANK: Record<TeamStatus, number> = { BEHIND: 0, AT_RISK: 1, ON_TRACK: 2 };
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Class overview: one row per team; sort by any column, filter by lab group, status and milestone. */
export function OverviewTable({ rows }: { rows: OverviewRow[] }) {
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [milestone, setMilestone] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "status", dir: 1 });
  const groups = [...new Map(rows.map((r) => [r.labGroupId, r.labGroup])).entries()];
  const milestones = [...new Set(rows.map((r) => r.milestone?.code).filter((x): x is string => !!x))].sort();

  const shown = useMemo(() => {
    const val = (r: OverviewRow): string | number => {
      switch (sort.key) {
        case "name":
          return r.name;
        case "labGroup":
          return r.labGroup;
        case "milestone":
          return r.milestone?.code ?? "";
        case "ev":
          return r.pv > 0 ? r.ev / r.pv : 1;
        case "hours":
          return r.planHours > 0 ? r.actualHours / r.planHours : 1;
        case "forms":
          return r.milestone?.percent ?? 1;
        case "days":
          return r.daysSinceActivity ?? 999;
        case "status":
          return STATUS_RANK[r.status.status];
        case "flags":
          return r.openFlags;
      }
    };
    return rows
      .filter((r) => (!group || r.labGroupId === group) && (!status || r.status.status === status) && (!milestone || r.milestone?.code === milestone))
      .sort((a, b) => {
        const x = val(a);
        const y = val(b);
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || a.name.localeCompare(b.name);
      });
  }, [rows, group, status, milestone, sort]);

  const th = (key: SortKey, label: string, right = false) => (
    <th className={`px-2 py-2 font-medium ${right ? "text-right" : "text-left"}`} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-slate-900" onClick={() => setSort({ key, dir: sort.key === key ? (sort.dir === 1 ? -1 : 1) : 1 })}>
        {label}
        <span aria-hidden className="text-xs">{sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-sm">
        <label>
          <span className="mr-1 text-slate-600">Lab group</span>
          <Select value={group} onChange={(e) => setGroup(e.target.value)} className="w-auto">
            <option value="">All</option>
            {groups.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="mr-1 text-slate-600">Status</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
            <option value="">All</option>
            <option value="ON_TRACK">On track</option>
            <option value="AT_RISK">At risk</option>
            <option value="BEHIND">Behind</option>
          </Select>
        </label>
        <label>
          <span className="mr-1 text-slate-600">Milestone</span>
          <Select value={milestone} onChange={(e) => setMilestone(e.target.value)} className="w-auto">
            <option value="">All</option>
            {milestones.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </label>
      </div>
      <div className="relative -mx-4 overflow-x-auto sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              {th("name", "Team")}
              {th("labGroup", "Group")}
              {th("milestone", "Milestone")}
              {th("ev", "EV vs PV", true)}
              {th("hours", "Hours actual / plan", true)}
              {th("forms", "Forms", true)}
              {th("days", "Last activity", true)}
              {th("status", "Status")}
              {th("flags", "Open flags", true)}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.teamId} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-2 py-2">
                  <Link href={`/monitor/teams/${r.teamId}`} className="font-medium text-blue-700 hover:underline">
                    {r.name}
                  </Link>
                  {r.project && <span className="block max-w-56 truncate text-xs text-slate-500">{r.project}</span>}
                </td>
                <td className="px-2 py-2">{r.labGroup}</td>
                <td className="px-2 py-2">{r.milestone?.code ?? "—"}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  {pct(r.ev)} / {pct(r.pv)}
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  {Math.round(r.actualHours)} / {Math.round(r.planHours)} h
                </td>
                <td className="px-2 py-2 text-right">{r.milestone ? pct(r.milestone.percent) : "—"}</td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  {r.daysSinceActivity === null ? "never" : r.daysSinceActivity === 0 ? "today" : `${r.daysSinceActivity} d ago`}
                </td>
                <td className="px-2 py-2">
                  <TeamStatusBadge status={r.status.status} reasons={r.status.reasons} />
                  {r.status.reasons.length > 0 && <span className="block max-w-64 text-xs text-slate-500">{r.status.reasons[0]}</span>}
                </td>
                <td className="px-2 py-2 text-right">{r.openFlags || ""}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2 py-4 text-slate-500">
                  No teams match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
